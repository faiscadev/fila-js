import { spawn } from "child_process";
import * as fs from "fs";
import { execFileSync } from "child_process";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import {
  FibpConnection,
  Op,
  encodeFrame,
  nextCorrId,
} from "../src/transport";

function findServerBinary(): string {
  if (process.env.FILA_SERVER_BIN) {
    return process.env.FILA_SERVER_BIN;
  }
  return path.join(__dirname, "..", "..", "fila", "target", "release", "fila-server");
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as net.AddressInfo;
      const port = addr.port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

export interface TestServer {
  addr: string;
  stop: () => void;
  createQueue: (name: string) => Promise<void>;
  /** Data directory — useful for writing TLS certs. */
  dataDir: string;
}

export interface TestServerOptions {
  /** Extra lines to append to fila.toml. */
  extraConfig?: string;
  /** Environment variables to merge. */
  extraEnv?: Record<string, string>;
  /** CA cert PEM for TLS admin connections. */
  adminCaCert?: Buffer;
  /** Client cert PEM for mTLS admin connections. */
  adminClientCert?: Buffer;
  /** Client key PEM for mTLS admin connections. */
  adminClientKey?: Buffer;
  /** API key to attach to admin requests. */
  adminApiKey?: string;
}

export const FILA_SERVER_BIN = findServerBinary();
export const FILA_SERVER_AVAILABLE = fs.existsSync(FILA_SERVER_BIN);

// ---- Binary admin encoding ---------------------------------------------------

/**
 * Encode a CreateQueue request using the binary wire format.
 *
 * Wire format:
 *   queue_len:u16 + queue:utf8
 *   + on_enqueue_len:u16 + on_enqueue:utf8
 *   + on_failure_len:u16 + on_failure:utf8
 *   + visibility_timeout_ms:u32
 */
function encodeCreateQueuePayload(name: string): Buffer {
  const nameBuf = Buffer.from(name, "utf8");
  const buf = Buffer.allocUnsafe(2 + nameBuf.length + 2 + 2 + 4);
  let off = 0;
  buf.writeUInt16BE(nameBuf.length, off); off += 2;
  nameBuf.copy(buf, off); off += nameBuf.length;
  buf.writeUInt16BE(0, off); off += 2; // on_enqueue: empty
  buf.writeUInt16BE(0, off); off += 2; // on_failure: empty
  buf.writeUInt32BE(0, off); // visibility_timeout_ms: 0
  return buf;
}

/**
 * Encode a ListQueues request (empty payload).
 */
function encodeListQueuesPayload(): Buffer {
  return Buffer.alloc(0);
}

// ---- Admin FIBP helpers -----------------------------------------------------

/** Connect to the server with optional TLS for admin use. */
async function connectAdmin(addr: string, opts: TestServerOptions): Promise<FibpConnection> {
  const lastColon = addr.lastIndexOf(":");
  const host = addr.slice(0, lastColon);
  const port = parseInt(addr.slice(lastColon + 1), 10);

  return FibpConnection.connect({
    host,
    port,
    tls: !!(opts.adminCaCert),
    caCert: opts.adminCaCert,
    clientCert: opts.adminClientCert,
    clientKey: opts.adminClientKey,
    apiKey: opts.adminApiKey,
  });
}

async function callListQueues(conn: FibpConnection): Promise<void> {
  const payload = encodeListQueuesPayload();
  await conn.request(Op.LIST_QUEUES, payload);
}

async function callCreateQueue(conn: FibpConnection, name: string): Promise<void> {
  const payload = encodeCreateQueuePayload(name);
  await conn.request(Op.CREATE_QUEUE, payload);
}

// ---- TestServer factory -----------------------------------------------------

export async function startTestServer(
  opts?: TestServerOptions
): Promise<TestServer> {
  const port = await findFreePort();
  const addr = `127.0.0.1:${port}`;

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "fila-test-"));

  // Write config file.
  const configPath = path.join(dataDir, "fila.toml");
  let config = `[fibp]\nlisten_addr = "${addr}"\n`;
  if (opts?.extraConfig) {
    config += opts.extraConfig + "\n";
  }
  fs.writeFileSync(configPath, config);

  const dbDir = path.join(dataDir, "db");

  const proc = spawn(FILA_SERVER_BIN, [], {
    cwd: dataDir,
    env: { ...process.env, FILA_DATA_DIR: dbDir, ...opts?.extraEnv },
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderrBuf = "";
  proc.stderr!.on("data", (chunk: Buffer) => {
    stderrBuf += chunk.toString();
  });

  // Wait for server ready — probe via FIBP ListQueues. 20s timeout.
  const deadline = Date.now() + 20000;
  let ready = false;
  let exited = false;
  proc.on("exit", () => { exited = true; });

  let lastErr: unknown;
  while (Date.now() < deadline && !exited) {
    let probeConn: FibpConnection | null = null;
    try {
      probeConn = await connectAdmin(addr, opts ?? {});
      await callListQueues(probeConn);
      ready = true;
      break;
    } catch (err) {
      lastErr = err;
      await sleep(500);
    } finally {
      probeConn?.destroy();
    }
  }

  if (!ready) {
    proc.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
    const detail = stderrBuf ? `\nServer stderr:\n${stderrBuf.slice(0, 2000)}` : "";
    const probeDetail = lastErr ? `\nLast probe error: ${lastErr}` : "";
    throw new Error(`fila-server failed to start within 20s on ${addr}${detail}${probeDetail}`);
  }

  // Persistent admin connection.
  let adminConn: FibpConnection;
  try {
    adminConn = await connectAdmin(addr, opts ?? {});
  } catch (err) {
    proc.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
    throw new Error(`fila-server started but admin connection failed: ${err}`);
  }

  return {
    addr,
    dataDir,
    stop: () => {
      proc.kill();
      adminConn.destroy();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
    createQueue: (name: string) => callCreateQueue(adminConn, name),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a self-signed CA + server + client certificate set for testing mTLS. */
export function generateTestCerts(outputDir: string): {
  caCert: Buffer;
  serverCert: Buffer;
  serverKey: Buffer;
  clientCert: Buffer;
  clientKey: Buffer;
} {
  const caKeyPath = path.join(outputDir, "ca.key");
  const caCertPath = path.join(outputDir, "ca.pem");
  const serverKeyPath = path.join(outputDir, "server.key");
  const serverCsrPath = path.join(outputDir, "server.csr");
  const serverCertPath = path.join(outputDir, "server.pem");
  const clientKeyPath = path.join(outputDir, "client.key");
  const clientCsrPath = path.join(outputDir, "client.csr");
  const clientCertPath = path.join(outputDir, "client.pem");
  const serverExtPath = path.join(outputDir, "server-ext.cnf");
  const clientExtPath = path.join(outputDir, "client-ext.cnf");

  // Write server SAN extension config.
  fs.writeFileSync(
    serverExtPath,
    "subjectAltName=IP:127.0.0.1,DNS:localhost\nextendedKeyUsage=serverAuth\n"
  );

  // Write client extension config (rustls requires clientAuth EKU).
  fs.writeFileSync(
    clientExtPath,
    "extendedKeyUsage=clientAuth\n"
  );

  // CA key + cert.
  execFileSync(
    "openssl",
    [
      "req", "-x509", "-newkey", "rsa:2048",
      "-keyout", caKeyPath, "-out", caCertPath,
      "-days", "1", "-nodes", "-subj", "/CN=fila-test-ca",
    ],
    { stdio: "ignore" }
  );

  // Server key + CSR + cert signed by CA.
  execFileSync(
    "openssl",
    [
      "req", "-newkey", "rsa:2048",
      "-keyout", serverKeyPath, "-out", serverCsrPath,
      "-nodes", "-subj", "/CN=localhost",
    ],
    { stdio: "ignore" }
  );
  execFileSync(
    "openssl",
    [
      "x509", "-req", "-in", serverCsrPath,
      "-CA", caCertPath, "-CAkey", caKeyPath,
      "-CAcreateserial", "-out", serverCertPath,
      "-days", "1", "-extfile", serverExtPath,
    ],
    { stdio: "ignore" }
  );

  // Client key + CSR + cert signed by CA.
  execFileSync(
    "openssl",
    [
      "req", "-newkey", "rsa:2048",
      "-keyout", clientKeyPath, "-out", clientCsrPath,
      "-nodes", "-subj", "/CN=fila-test-client",
    ],
    { stdio: "ignore" }
  );
  execFileSync(
    "openssl",
    [
      "x509", "-req", "-in", clientCsrPath,
      "-CA", caCertPath, "-CAkey", caKeyPath,
      "-CAcreateserial", "-out", clientCertPath,
      "-days", "1", "-extfile", clientExtPath,
    ],
    { stdio: "ignore" }
  );

  return {
    caCert: fs.readFileSync(caCertPath),
    serverCert: fs.readFileSync(serverCertPath),
    serverKey: fs.readFileSync(serverKeyPath),
    clientCert: fs.readFileSync(clientCertPath),
    clientKey: fs.readFileSync(clientKeyPath),
  };
}

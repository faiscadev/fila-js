import { spawn } from "child_process";
import * as fs from "fs";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import { execFileSync } from "child_process";
import { Client } from "../src";

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
  /** API key for admin operations (used in handshake). */
  adminApiKey?: string;
  /** TLS options for admin connections. */
  adminTls?: {
    caCert?: Buffer;
    clientCert?: Buffer;
    clientKey?: Buffer;
  };
}

export const FILA_SERVER_BIN = findServerBinary();
export const FILA_SERVER_AVAILABLE = fs.existsSync(FILA_SERVER_BIN);

export async function startTestServer(
  opts?: TestServerOptions
): Promise<TestServer> {
  const port = await findFreePort();
  const addr = `127.0.0.1:${port}`;

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "fila-test-"));

  // Write config file.
  const configPath = path.join(dataDir, "fila.toml");
  let config = `[server]\nlisten_addr = "${addr}"\n`;
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

  let exited = false;
  proc.on("exit", () => { exited = true; });

  // Wait for server ready by attempting a listQueues via FIBP.
  const deadline = Date.now() + 20000;
  let ready = false;
  let lastErr: unknown;

  while (Date.now() < deadline && !exited) {
    try {
      const probe = new Client(addr, {
        apiKey: opts?.adminApiKey,
        tls: !!opts?.adminTls,
        caCert: opts?.adminTls?.caCert,
        clientCert: opts?.adminTls?.clientCert,
        clientKey: opts?.adminTls?.clientKey,
      });
      await probe.connect();
      await probe.listQueues();
      await probe.close();
      ready = true;
      break;
    } catch (err) {
      lastErr = err;
      await sleep(500);
    }
  }

  if (!ready) {
    proc.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
    const detail = stderrBuf ? `\nServer stderr:\n${stderrBuf.slice(0, 2000)}` : "";
    const probeDetail = lastErr ? `\nLast probe error: ${lastErr}` : "";
    throw new Error(`fila-server failed to start within 20s on ${addr}${detail}${probeDetail}`);
  }

  // Create admin client for createQueue helper.
  const adminClient = new Client(addr, {
    apiKey: opts?.adminApiKey,
    tls: !!opts?.adminTls,
    caCert: opts?.adminTls?.caCert,
    clientCert: opts?.adminTls?.clientCert,
    clientKey: opts?.adminTls?.clientKey,
  });
  await adminClient.connect();

  return {
    addr,
    dataDir,
    stop: () => {
      proc.kill();
      adminClient.close().catch(() => {});
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
    createQueue: async (name: string) => {
      await adminClient.createQueue(name);
    },
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

  fs.writeFileSync(
    serverExtPath,
    "subjectAltName=IP:127.0.0.1,DNS:localhost\nextendedKeyUsage=serverAuth\n"
  );

  fs.writeFileSync(
    clientExtPath,
    "extendedKeyUsage=clientAuth\n"
  );

  execFileSync(
    "openssl",
    [
      "req", "-x509", "-newkey", "rsa:2048",
      "-keyout", caKeyPath, "-out", caCertPath,
      "-days", "1", "-nodes", "-subj", "/CN=fila-test-ca",
    ],
    { stdio: "ignore" }
  );

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

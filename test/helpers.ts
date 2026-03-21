import { spawn, execFileSync } from "child_process";
import * as fs from "fs";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const PROTO_DIR = path.join(__dirname, "..", "proto");

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
  /** gRPC credentials for admin/readiness connections (default: insecure). */
  adminCreds?: grpc.ChannelCredentials;
  /** API key metadata to attach to admin RPCs. */
  adminApiKey?: string;
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

  const creds = opts?.adminCreds ?? grpc.credentials.createInsecure();
  const adminMeta = new grpc.Metadata();
  if (opts?.adminApiKey) {
    adminMeta.set("authorization", `Bearer ${opts.adminApiKey}`);
  }

  // Wait for server ready. 20s to accommodate TLS cert generation + startup in CI.
  const deadline = Date.now() + 20000;
  let ready = false;
  let exited = false;
  proc.on("exit", () => { exited = true; });
  while (Date.now() < deadline && !exited) {
    try {
      await tryListQueues(addr, creds, adminMeta);
      ready = true;
      break;
    } catch {
      await sleep(50);
    }
  }
  if (!ready) {
    proc.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
    const detail = stderrBuf ? `\nServer stderr:\n${stderrBuf.slice(0, 2000)}` : "";
    throw new Error(`fila-server failed to start within 20s on ${addr}${detail}`);
  }

  // Load admin proto for queue creation.
  const adminPackageDef = protoLoader.loadSync(
    [
      path.join(PROTO_DIR, "fila", "v1", "admin.proto"),
      path.join(PROTO_DIR, "fila", "v1", "messages.proto"),
    ],
    {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [PROTO_DIR],
    }
  );
  const adminProto = grpc.loadPackageDefinition(adminPackageDef);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AdminService = (adminProto.fila as any).v1.FilaAdmin as grpc.ServiceClientConstructor;
  const adminClient = new AdminService(addr, creds);

  return {
    addr,
    dataDir,
    stop: () => {
      proc.kill();
      adminClient.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
    createQueue: (name: string) => {
      return new Promise<void>((resolve, reject) => {
        adminClient.createQueue(
          { name, config: {} },
          adminMeta,
          (err: grpc.ServiceError | null) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    },
  };
}

function tryListQueues(
  addr: string,
  creds: grpc.ChannelCredentials,
  metadata: grpc.Metadata
): Promise<void> {
  const packageDef = protoLoader.loadSync(
    [
      path.join(PROTO_DIR, "fila", "v1", "admin.proto"),
      path.join(PROTO_DIR, "fila", "v1", "messages.proto"),
    ],
    {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [PROTO_DIR],
    }
  );
  const proto = grpc.loadPackageDefinition(packageDef);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AdminService = (proto.fila as any).v1.FilaAdmin as grpc.ServiceClientConstructor;
  const client = new AdminService(addr, creds);

  return new Promise<void>((resolve, reject) => {
    client.listQueues({}, metadata, (err: grpc.ServiceError | null) => {
      client.close();
      if (err) reject(err);
      else resolve();
    });
  });
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
  const extPath = path.join(outputDir, "ext.cnf");

  // Write SAN extension config.
  fs.writeFileSync(
    extPath,
    "subjectAltName=IP:127.0.0.1,DNS:localhost\n"
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
      "-days", "1", "-extfile", extPath,
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
      "-days", "1",
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

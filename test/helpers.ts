import { spawn } from "child_process";
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
}

export const FILA_SERVER_BIN = findServerBinary();
export const FILA_SERVER_AVAILABLE = fs.existsSync(FILA_SERVER_BIN);

export async function startTestServer(): Promise<TestServer> {
  const port = await findFreePort();
  const addr = `127.0.0.1:${port}`;

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "fila-test-"));

  // Write config file.
  const configPath = path.join(dataDir, "fila.toml");
  fs.writeFileSync(configPath, `[server]\nlisten_addr = "${addr}"\n`);

  const dbDir = path.join(dataDir, "db");

  const proc = spawn(FILA_SERVER_BIN, [], {
    cwd: dataDir,
    env: { ...process.env, FILA_DATA_DIR: dbDir },
    stdio: "ignore",
  });

  // Wait for server ready.
  const deadline = Date.now() + 10000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      await tryListQueues(addr);
      ready = true;
      break;
    } catch {
      await sleep(50);
    }
  }
  if (!ready) {
    proc.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
    throw new Error(`fila-server failed to start within 10s on ${addr}`);
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
  const adminClient = new AdminService(addr, grpc.credentials.createInsecure());

  return {
    addr,
    stop: () => {
      proc.kill();
      adminClient.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
    createQueue: (name: string) => {
      return new Promise<void>((resolve, reject) => {
        adminClient.createQueue(
          { name, config: {} },
          (err: grpc.ServiceError | null) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    },
  };
}

function tryListQueues(addr: string): Promise<void> {
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
  const client = new AdminService(addr, grpc.credentials.createInsecure());

  return new Promise<void>((resolve, reject) => {
    client.listQueues({}, (err: grpc.ServiceError | null) => {
      client.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

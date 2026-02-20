import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as fs from "fs";
import * as path from "path";

import {
  FilaError,
  MessageNotFoundError,
  QueueNotFoundError,
  RPCError,
} from "./errors";
import type { ConsumeMessage } from "./types";
import type { FilaServiceClient } from "../generated/fila/v1/FilaService";
import type { EnqueueResponse__Output } from "../generated/fila/v1/EnqueueResponse";
import type { ConsumeResponse__Output } from "../generated/fila/v1/ConsumeResponse";

function resolveProtoDir(): string {
  // Source (dev/test): __dirname = <root>/src/
  const devPath = path.join(__dirname, "..", "proto");
  if (fs.existsSync(devPath)) return devPath;
  // Built (dist): __dirname = <root>/dist/src/
  return path.join(__dirname, "..", "..", "proto");
}

const PROTO_DIR = resolveProtoDir();

function loadServiceProto(): grpc.GrpcObject {
  const packageDefinition = protoLoader.loadSync(
    [
      path.join(PROTO_DIR, "fila", "v1", "service.proto"),
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
  return grpc.loadPackageDefinition(packageDefinition);
}

function mapEnqueueError(err: grpc.ServiceError): FilaError {
  if (err.code === grpc.status.NOT_FOUND) {
    return new QueueNotFoundError(`enqueue: ${err.details}`);
  }
  return new RPCError(err.code, err.details);
}

function mapConsumeError(err: grpc.ServiceError): FilaError {
  if (err.code === grpc.status.NOT_FOUND) {
    return new QueueNotFoundError(`consume: ${err.details}`);
  }
  return new RPCError(err.code, err.details);
}

function mapAckError(err: grpc.ServiceError): FilaError {
  if (err.code === grpc.status.NOT_FOUND) {
    return new MessageNotFoundError(`ack: ${err.details}`);
  }
  return new RPCError(err.code, err.details);
}

function mapNackError(err: grpc.ServiceError): FilaError {
  if (err.code === grpc.status.NOT_FOUND) {
    return new MessageNotFoundError(`nack: ${err.details}`);
  }
  return new RPCError(err.code, err.details);
}

/**
 * Client for the Fila message broker.
 *
 * Wraps the hot-path gRPC operations: enqueue, consume, ack, nack.
 *
 * @example
 * ```typescript
 * const client = new Client("localhost:5555");
 * const msgId = await client.enqueue("my-queue", { tenant: "acme" }, Buffer.from("hello"));
 * for await (const msg of client.consume("my-queue")) {
 *   await client.ack("my-queue", msg.id);
 * }
 * client.close();
 * ```
 */
export class Client {
  private readonly grpcClient: FilaServiceClient;

  /**
   * Connect to a Fila broker at the given address.
   * @param addr - Broker address in "host:port" format (e.g., "localhost:5555").
   */
  constructor(addr: string) {
    const proto = loadServiceProto();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FilaService = (proto.fila as any).v1
      .FilaService as grpc.ServiceClientConstructor;
    this.grpcClient = new FilaService(
      addr,
      grpc.credentials.createInsecure()
    ) as unknown as FilaServiceClient;
  }

  /** Close the underlying gRPC channel. */
  close(): void {
    (this.grpcClient as unknown as grpc.Client).close();
  }

  /**
   * Enqueue a message to the specified queue.
   * @param queue - Target queue name.
   * @param headers - Optional message headers.
   * @param payload - Message payload bytes.
   * @returns Broker-assigned message ID (UUIDv7).
   * @throws {QueueNotFoundError} If the queue does not exist.
   * @throws {RPCError} For unexpected gRPC failures.
   */
  enqueue(
    queue: string,
    headers: Record<string, string> | null,
    payload: Buffer
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.grpcClient.enqueue(
        { queue, headers: headers ?? {}, payload },
        (err: grpc.ServiceError | null, resp?: EnqueueResponse__Output) => {
          if (err) {
            reject(mapEnqueueError(err));
          } else {
            resolve(resp!.messageId);
          }
        }
      );
    });
  }

  /**
   * Open a streaming consumer on the specified queue.
   *
   * Returns an async iterable that yields messages as they become available.
   * Nil message frames (keepalive signals) are skipped automatically.
   *
   * @param queue - Queue to consume from.
   * @throws {QueueNotFoundError} If the queue does not exist.
   * @throws {RPCError} For unexpected gRPC failures.
   */
  async *consume(queue: string): AsyncIterable<ConsumeMessage> {
    const stream = this.grpcClient.consume({ queue });

    // Wrap the Node.js readable stream into an async iterable.
    // grpc-js streams are already async-iterable in modern versions.
    const iterable = stream as AsyncIterable<ConsumeResponse__Output>;

    try {
      for await (const resp of iterable) {
        const msg = resp.message;
        if (!msg || !msg.id) {
          continue; // keepalive frame
        }
        const metadata = msg.metadata;
        yield {
          id: msg.id,
          headers: msg.headers ?? {},
          payload: Buffer.isBuffer(msg.payload)
            ? msg.payload
            : Buffer.from(msg.payload ?? ""),
          fairnessKey: metadata?.fairnessKey ?? "",
          attemptCount: metadata?.attemptCount ?? 0,
          queue: metadata?.queueId ?? "",
        };
      }
    } catch (err) {
      const svcErr = err as grpc.ServiceError;
      if (svcErr.code !== undefined && svcErr.code !== grpc.status.CANCELLED) {
        throw mapConsumeError(svcErr);
      }
      // Stream cancelled or closed normally — just return.
    } finally {
      stream.cancel();
    }
  }

  /**
   * Acknowledge a successfully processed message.
   * @param queue - Queue the message belongs to.
   * @param msgId - ID of the message to acknowledge.
   * @throws {MessageNotFoundError} If the message does not exist.
   * @throws {RPCError} For unexpected gRPC failures.
   */
  ack(queue: string, msgId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.grpcClient.ack(
        { queue, messageId: msgId },
        (err: grpc.ServiceError | null) => {
          if (err) {
            reject(mapAckError(err));
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Negatively acknowledge a message that failed processing.
   * @param queue - Queue the message belongs to.
   * @param msgId - ID of the message to nack.
   * @param error - Description of the failure.
   * @throws {MessageNotFoundError} If the message does not exist.
   * @throws {RPCError} For unexpected gRPC failures.
   */
  nack(queue: string, msgId: string, error: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.grpcClient.nack(
        { queue, messageId: msgId, error },
        (err: grpc.ServiceError | null) => {
          if (err) {
            reject(mapNackError(err));
          } else {
            resolve();
          }
        }
      );
    });
  }
}

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
import type { ConsumeMessage, EnqueueMessage, EnqueueResult } from "./types";
import type { FilaServiceClient } from "../generated/fila/v1/FilaService";
import type { EnqueueResponse__Output } from "../generated/fila/v1/EnqueueResponse";
import type { AckResponse__Output } from "../generated/fila/v1/AckResponse";
import type { NackResponse__Output } from "../generated/fila/v1/NackResponse";
import type { ConsumeResponse__Output } from "../generated/fila/v1/ConsumeResponse";
import { Batcher, type BatchMode } from "./batcher";

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

/** Metadata key the server uses to indicate the current queue leader address. */
const LEADER_ADDR_KEY = "x-fila-leader-addr";

/**
 * Extract the leader address from a gRPC UNAVAILABLE error's trailing metadata.
 * Returns the address string, or undefined if not present.
 */
function extractLeaderAddr(err: grpc.ServiceError): string | undefined {
  if (err.code !== grpc.status.UNAVAILABLE) return undefined;
  const values = err.metadata?.get(LEADER_ADDR_KEY);
  if (values && values.length > 0) {
    return String(values[0]);
  }
  return undefined;
}

/** Create a FilaServiceClient for the given address and credentials. */
function createGrpcClient(
  addr: string,
  creds: grpc.ChannelCredentials
): FilaServiceClient {
  const proto = loadServiceProto();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FilaService = (proto.fila as any).v1
    .FilaService as grpc.ServiceClientConstructor;
  return new FilaService(addr, creds) as unknown as FilaServiceClient;
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

/**
 * Map a per-message EnqueueResult error code to an SDK error type.
 */
function mapEnqueueResultError(code: string, message: string): FilaError {
  if (code === "ENQUEUE_ERROR_CODE_QUEUE_NOT_FOUND") {
    return new QueueNotFoundError(`enqueue: ${message}`);
  }
  return new RPCError(grpc.status.INTERNAL, message);
}

/**
 * Map a per-message AckResult error code to an SDK error type.
 */
function mapAckResultError(code: string, message: string): FilaError {
  if (code === "ACK_ERROR_CODE_MESSAGE_NOT_FOUND") {
    return new MessageNotFoundError(`ack: ${message}`);
  }
  return new RPCError(grpc.status.INTERNAL, message);
}

/**
 * Map a per-message NackResult error code to an SDK error type.
 */
function mapNackResultError(code: string, message: string): FilaError {
  if (code === "NACK_ERROR_CODE_MESSAGE_NOT_FOUND") {
    return new MessageNotFoundError(`nack: ${message}`);
  }
  return new RPCError(grpc.status.INTERNAL, message);
}

/** Map a ConsumeResponse to ConsumeMessage(s), skipping keepalive frames. */
function mapConsumeResponse(
  resp: ConsumeResponse__Output
): ConsumeMessage[] {
  if (!resp.messages || resp.messages.length === 0) {
    return []; // keepalive frame
  }

  const results: ConsumeMessage[] = [];
  for (const msg of resp.messages) {
    if (!msg || !msg.id) continue;
    const metadata = msg.metadata;
    results.push({
      id: msg.id,
      headers: msg.headers ?? {},
      payload: Buffer.isBuffer(msg.payload)
        ? msg.payload
        : Buffer.from(msg.payload ?? ""),
      fairnessKey: metadata?.fairnessKey ?? "",
      attemptCount: metadata?.attemptCount ?? 0,
      queue: metadata?.queueId ?? "",
    });
  }
  return results;
}

/** Connection options for TLS, authentication, and batching. */
export interface ClientOptions {
  /**
   * Enable TLS using the OS system trust store for server verification.
   * When `true` and `caCert` is not provided, the system root certificates
   * are used automatically. When `caCert` is provided, this is implied.
   */
  tls?: boolean;
  /** CA certificate PEM for server verification. When set, enables TLS. */
  caCert?: Buffer;
  /** Client certificate PEM for mutual TLS (mTLS). Requires TLS to be enabled (via `tls: true` or `caCert`). */
  clientCert?: Buffer;
  /** Client private key PEM for mutual TLS (mTLS). Requires TLS to be enabled (via `tls: true` or `caCert`). */
  clientKey?: Buffer;
  /** API key for authentication. Sent as `authorization: Bearer <key>` metadata on every RPC. */
  apiKey?: string;
  /**
   * Batch mode for enqueue() calls.
   *
   * - `'auto'` (DEFAULT): Opportunistic batching via setImmediate. Zero config,
   *   zero latency penalty at low load. Messages cluster naturally at high load.
   * - `'linger'`: Timer-based batching with explicit `lingerMs` and `batchSize`.
   * - `'disabled'`: No batching. Each enqueue() is a direct RPC.
   *
   * @default 'auto'
   */
  batchMode?: "auto" | "linger" | "disabled";
  /** Maximum batch size for auto mode. Default: 100. */
  maxBatchSize?: number;
  /** Linger time in milliseconds for linger mode. Required when batchMode is 'linger'. */
  lingerMs?: number;
  /** Maximum messages per batch for linger mode. Required when batchMode is 'linger'. */
  batchSize?: number;
}

/**
 * Client for the Fila message broker.
 *
 * Wraps the hot-path gRPC operations: enqueue, consume, ack, nack.
 * By default, enqueue() calls are automatically batched for optimal throughput
 * with zero added latency at low load.
 *
 * @example
 * ```typescript
 * const client = new Client("localhost:5555");
 * const msgId = await client.enqueue("my-queue", { tenant: "acme" }, Buffer.from("hello"));
 * for await (const msg of client.consume("my-queue")) {
 *   await client.ack("my-queue", msg.id);
 * }
 * await client.close();
 * ```
 */
export class Client {
  private readonly grpcClient: FilaServiceClient;
  private readonly creds: grpc.ChannelCredentials;
  private readonly apiKey?: string;
  private readonly batcher: Batcher | null;

  /**
   * Connect to a Fila broker at the given address.
   * @param addr - Broker address in "host:port" format (e.g., "localhost:5555").
   * @param options - Optional TLS, authentication, and batching settings.
   */
  constructor(addr: string, options?: ClientOptions) {
    const hasClientCert = !!options?.clientCert;
    const hasClientKey = !!options?.clientKey;
    const tlsEnabled = !!options?.tls || !!options?.caCert;

    if ((hasClientCert || hasClientKey) && !tlsEnabled) {
      throw new Error("clientCert/clientKey require TLS to be enabled (set tls: true or provide caCert)");
    }
    if (hasClientCert !== hasClientKey) {
      throw new Error("clientCert and clientKey must be provided together");
    }

    if (options?.caCert) {
      this.creds = grpc.credentials.createSsl(
        options.caCert,
        options.clientKey ?? null,
        options.clientCert ?? null
      );
    } else if (tlsEnabled) {
      this.creds = grpc.credentials.createSsl(
        null,
        options?.clientKey ?? null,
        options?.clientCert ?? null
      );
    } else {
      this.creds = grpc.credentials.createInsecure();
    }

    this.grpcClient = createGrpcClient(addr, this.creds);
    this.apiKey = options?.apiKey;

    // Initialize the batcher based on the configured mode.
    const modeStr = options?.batchMode ?? "auto";
    if (modeStr === "disabled") {
      this.batcher = null;
    } else {
      let batchMode: BatchMode;
      if (modeStr === "linger") {
        if (options?.lingerMs === undefined || options?.batchSize === undefined) {
          throw new Error("lingerMs and batchSize are required when batchMode is 'linger'");
        }
        batchMode = {
          mode: "linger",
          lingerMs: options.lingerMs,
          batchSize: options.batchSize,
        };
      } else {
        batchMode = {
          mode: "auto",
          maxBatchSize: options?.maxBatchSize,
        };
      }
      this.batcher = new Batcher(
        this.grpcClient,
        () => this.callMetadata(),
        batchMode
      );
    }
  }

  /** Build gRPC metadata, attaching the API key if configured. */
  private callMetadata(): grpc.Metadata {
    const md = new grpc.Metadata();
    if (this.apiKey) {
      md.set("authorization", `Bearer ${this.apiKey}`);
    }
    return md;
  }

  /**
   * Close the client, draining any pending batched messages first.
   * Returns a promise that resolves when all pending messages have been
   * flushed and the gRPC channel is closed.
   */
  async close(): Promise<void> {
    if (this.batcher) {
      await this.batcher.drain();
    }
    (this.grpcClient as unknown as grpc.Client).close();
  }

  /**
   * Enqueue a message to the specified queue.
   *
   * When batching is enabled (default), the message is routed through the
   * batcher. At low load, messages are sent individually. At high load,
   * messages cluster naturally into larger Enqueue RPCs.
   *
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
    // Route through the batcher when enabled.
    if (this.batcher) {
      return this.batcher.submit({
        queue,
        headers: headers ?? {},
        payload,
      });
    }

    // No batching: direct RPC with single message in the repeated field.
    return new Promise((resolve, reject) => {
      this.grpcClient.enqueue(
        { messages: [{ queue, headers: headers ?? {}, payload }] },
        this.callMetadata(),
        (err: grpc.ServiceError | null, resp?: EnqueueResponse__Output) => {
          if (err) {
            reject(mapEnqueueError(err));
            return;
          }
          const result = resp!.results[0];
          if (!result) {
            reject(new RPCError(grpc.status.INTERNAL, "no result from server"));
            return;
          }
          if (result.result === "messageId" && result.messageId) {
            resolve(result.messageId);
          } else if (result.result === "error" && result.error) {
            reject(mapEnqueueResultError(result.error.code, result.error.message));
          } else {
            reject(new RPCError(grpc.status.INTERNAL, "no result from server"));
          }
        }
      );
    });
  }

  /**
   * Enqueue multiple messages in a single RPC call.
   *
   * Each message is independently validated and processed. A failed message
   * does not affect the others. Returns one result per input message,
   * in the same order.
   *
   * This always bypasses the batcher and issues a direct Enqueue RPC.
   *
   * @param messages - Array of messages to enqueue.
   * @returns Per-message results (success with messageId, or error with description).
   * @throws {RPCError} For transport-level failures affecting the entire call.
   */
  enqueueMany(messages: EnqueueMessage[]): Promise<EnqueueResult[]> {
    const protoMessages = messages.map((m) => ({
      queue: m.queue,
      headers: m.headers,
      payload: m.payload,
    }));

    return new Promise<EnqueueResult[]>((resolve, reject) => {
      this.grpcClient.enqueue(
        { messages: protoMessages },
        this.callMetadata(),
        (err: grpc.ServiceError | null, resp?: EnqueueResponse__Output) => {
          if (err) {
            reject(new RPCError(err.code, err.details));
            return;
          }

          const results: EnqueueResult[] = resp!.results.map((r) => {
            if (r.result === "messageId" && r.messageId) {
              return {
                success: true as const,
                messageId: r.messageId,
              };
            } else if (r.result === "error" && r.error) {
              return {
                success: false as const,
                error: r.error.message,
              };
            } else {
              return {
                success: false as const,
                error: "no result from server",
              };
            }
          });

          resolve(results);
        }
      );
    });
  }

  /**
   * Open a streaming consumer on the specified queue.
   *
   * Returns an async iterable that yields messages as they become available.
   * Empty response frames (keepalive signals) are skipped automatically.
   * Delivery frames containing multiple messages are transparently unpacked
   * into individual messages.
   *
   * If the server returns UNAVAILABLE with an `x-fila-leader-addr` metadata
   * header, the client transparently reconnects to the leader node and retries
   * the consume stream once (max 1 redirect per call).
   *
   * @param queue - Queue to consume from.
   * @throws {QueueNotFoundError} If the queue does not exist.
   * @throws {RPCError} For unexpected gRPC failures.
   */
  async *consume(queue: string): AsyncIterable<ConsumeMessage> {
    yield* this.consumeInner(queue, false);
  }

  /**
   * Inner consume implementation that optionally follows a leader hint.
   * @param redirected - true if this is already a redirected attempt (prevents loops).
   */
  private async *consumeInner(
    queue: string,
    redirected: boolean
  ): AsyncIterable<ConsumeMessage> {
    const stream = this.grpcClient.consume({ queue }, this.callMetadata());
    const iterable = stream as AsyncIterable<ConsumeResponse__Output>;

    try {
      for await (const resp of iterable) {
        const messages = mapConsumeResponse(resp);
        for (const msg of messages) {
          yield msg;
        }
      }
    } catch (err) {
      const svcErr = err as grpc.ServiceError;

      // If we haven't redirected yet and the server tells us who the leader is,
      // open a new connection to the leader and retry the consume stream.
      if (!redirected) {
        const leaderAddr = extractLeaderAddr(svcErr);
        if (leaderAddr) {
          stream.cancel();
          const leaderClient = createGrpcClient(leaderAddr, this.creds);
          const leaderStream = leaderClient.consume(
            { queue },
            this.callMetadata()
          );
          const leaderIterable =
            leaderStream as AsyncIterable<ConsumeResponse__Output>;
          try {
            for await (const resp of leaderIterable) {
              const messages = mapConsumeResponse(resp);
              for (const msg of messages) {
                yield msg;
              }
            }
          } catch (retryErr) {
            const retrySvcErr = retryErr as grpc.ServiceError;
            if (
              retrySvcErr.code !== undefined &&
              retrySvcErr.code !== grpc.status.CANCELLED
            ) {
              throw mapConsumeError(retrySvcErr);
            }
          } finally {
            leaderStream.cancel();
            (leaderClient as unknown as grpc.Client).close();
          }
          return;
        }
      }

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
        { messages: [{ queue, messageId: msgId }] },
        this.callMetadata(),
        (err: grpc.ServiceError | null, resp?: AckResponse__Output) => {
          if (err) {
            reject(new RPCError(err.code, err.details));
            return;
          }
          const result = resp!.results[0];
          if (!result) {
            reject(new RPCError(grpc.status.INTERNAL, "no result from server"));
            return;
          }
          if (result.result === "success") {
            resolve();
          } else if (result.result === "error" && result.error) {
            reject(mapAckResultError(result.error.code, result.error.message));
          } else {
            reject(new RPCError(grpc.status.INTERNAL, "no result from server"));
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
        { messages: [{ queue, messageId: msgId, error }] },
        this.callMetadata(),
        (err: grpc.ServiceError | null, resp?: NackResponse__Output) => {
          if (err) {
            reject(new RPCError(err.code, err.details));
            return;
          }
          const result = resp!.results[0];
          if (!result) {
            reject(new RPCError(grpc.status.INTERNAL, "no result from server"));
            return;
          }
          if (result.result === "success") {
            resolve();
          } else if (result.result === "error" && result.error) {
            reject(mapNackResultError(result.error.code, result.error.message));
          } else {
            reject(new RPCError(grpc.status.INTERNAL, "no result from server"));
          }
        }
      );
    });
  }
}

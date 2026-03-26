import {
  FilaError,
  MessageNotFoundError,
  QueueNotFoundError,
  RPCError,
  UnauthenticatedError,
} from "./errors";
import type { ConsumeMessage, EnqueueMessage, EnqueueResult } from "./types";
import { Batcher, type BatchMode } from "./batcher";
import {
  FibpConnection,
  Op,
  ErrCode,
  encodeEnqueuePayload,
  decodeEnqueueResponse,
  encodeConsumePayload,
  decodeConsumeDelivery,
  encodeAckPayload,
  encodeNackPayload,
  decodeAckNackResponse,
  type ConnectOptions,
} from "./transport";

// ---- Error mapping ----------------------------------------------------------

function mapEnqueueWireError(errCode: number, errMsg: string): FilaError {
  switch (errCode) {
    case ErrCode.QUEUE_NOT_FOUND:
      return new QueueNotFoundError(`enqueue: ${errMsg}`);
    case ErrCode.UNAUTHORIZED:
      return new UnauthenticatedError(`enqueue: ${errMsg}`);
    default:
      return new RPCError(errCode, errMsg);
  }
}

function mapConsumeWireError(errCode: number, errMsg: string): FilaError {
  switch (errCode) {
    case ErrCode.QUEUE_NOT_FOUND:
      return new QueueNotFoundError(`consume: ${errMsg}`);
    case ErrCode.UNAUTHORIZED:
      return new UnauthenticatedError(`consume: ${errMsg}`);
    default:
      return new RPCError(errCode, errMsg);
  }
}

function mapAckWireError(errCode: number, errMsg: string): FilaError {
  switch (errCode) {
    case ErrCode.MESSAGE_NOT_FOUND:
      return new MessageNotFoundError(`ack: ${errMsg}`);
    case ErrCode.UNAUTHORIZED:
      return new UnauthenticatedError(`ack: ${errMsg}`);
    default:
      return new RPCError(errCode, errMsg);
  }
}

function mapNackWireError(errCode: number, errMsg: string): FilaError {
  switch (errCode) {
    case ErrCode.MESSAGE_NOT_FOUND:
      return new MessageNotFoundError(`nack: ${errMsg}`);
    case ErrCode.UNAUTHORIZED:
      return new UnauthenticatedError(`nack: ${errMsg}`);
    default:
      return new RPCError(errCode, errMsg);
  }
}

// ---- Helpers ----------------------------------------------------------------

/** Parse "host:port" into { host, port }. Handles IPv6 bracket notation. */
function parseAddr(addr: string): { host: string; port: number } {
  // IPv6: [::1]:5555
  if (addr.startsWith("[")) {
    const bracket = addr.lastIndexOf("]");
    const host = addr.slice(1, bracket);
    const port = parseInt(addr.slice(bracket + 2), 10);
    return { host, port };
  }
  const lastColon = addr.lastIndexOf(":");
  const host = addr.slice(0, lastColon);
  const port = parseInt(addr.slice(lastColon + 1), 10);
  return { host, port };
}

// ---- ClientOptions ----------------------------------------------------------

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
  /** API key for authentication. Sent as an AUTH frame immediately after the handshake. */
  apiKey?: string;
  /**
   * Batch mode for enqueue() calls.
   *
   * - `'auto'` (DEFAULT): Opportunistic batching via setImmediate. Zero config,
   *   zero latency penalty at low load. Messages cluster naturally at high load.
   * - `'linger'`: Timer-based batching with explicit `lingerMs` and `batchSize`.
   * - `'disabled'`: No batching. Each enqueue() is a direct request.
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

// ---- Client -----------------------------------------------------------------

/**
 * Client for the Fila message broker (FIBP transport).
 *
 * Wraps the hot-path FIBP operations: enqueue, consume, ack, nack.
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
  private readonly connectOpts: ConnectOptions;
  private readonly batchMode: BatchMode;
  private conn: FibpConnection | null = null;
  private connectPromise: Promise<FibpConnection> | null = null;
  private batcher: Batcher | null = null;

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

    const { host, port } = parseAddr(addr);
    this.connectOpts = {
      host,
      port,
      tls: tlsEnabled,
      caCert: options?.caCert,
      clientCert: options?.clientCert,
      clientKey: options?.clientKey,
      apiKey: options?.apiKey,
    };

    // Initialize batch mode.
    const modeStr = options?.batchMode ?? "auto";
    if (modeStr === "disabled") {
      this.batchMode = { mode: "disabled" };
    } else if (modeStr === "linger") {
      if (options?.lingerMs === undefined || options?.batchSize === undefined) {
        throw new Error("lingerMs and batchSize are required when batchMode is 'linger'");
      }
      this.batchMode = {
        mode: "linger",
        lingerMs: options.lingerMs,
        batchSize: options.batchSize,
      };
    } else {
      this.batchMode = {
        mode: "auto",
        maxBatchSize: options?.maxBatchSize,
      };
    }

    if (modeStr !== "disabled") {
      this.batcher = new Batcher(() => this.getConn(), this.batchMode);
    }
  }

  // ---- Connection management ------------------------------------------------

  /** Get the current connection, lazily establishing it. */
  private async getConn(): Promise<FibpConnection> {
    if (this.conn && !this.conn.closed) {
      return this.conn;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }
    this.connectPromise = FibpConnection.connect(this.connectOpts).then((c) => {
      this.conn = c;
      this.connectPromise = null;
      c.on("close", () => {
        if (this.conn === c) this.conn = null;
      });
      return c;
    }).catch((err) => {
      this.connectPromise = null;
      throw err;
    });
    return this.connectPromise;
  }

  /**
   * Close the client, draining any pending batched messages first.
   * Returns a promise that resolves when all pending messages have been
   * flushed and the TCP connection is closed.
   */
  async close(): Promise<void> {
    if (this.batcher) {
      await this.batcher.drain();
    }
    this.conn?.destroy();
    this.conn = null;
  }

  // ---- Enqueue --------------------------------------------------------------

  /**
   * Enqueue a message to the specified queue.
   *
   * When batching is enabled (default), the message is routed through the
   * batcher. At low load, messages are sent individually. At high load,
   * messages cluster naturally into larger ENQUEUE requests.
   *
   * @param queue - Target queue name.
   * @param headers - Optional message headers.
   * @param payload - Message payload bytes.
   * @returns Broker-assigned message ID (UUIDv7).
   * @throws {QueueNotFoundError} If the queue does not exist.
   * @throws {UnauthenticatedError} If authentication fails.
   * @throws {RPCError} For unexpected protocol failures.
   */
  async enqueue(
    queue: string,
    headers: Record<string, string> | null,
    payload: Buffer
  ): Promise<string> {
    // When batching is enabled, submit synchronously (before any await) so
    // that a concurrent close()/drain() cannot mark the batcher closed before
    // this message is queued. The batcher calls getConn() asynchronously when
    // it flushes, so no prior connection is needed here.
    if (this.batcher) {
      return this.batcher.submit({ queue, headers: headers ?? {}, payload });
    }

    const conn = await this.getConn();

    // No batching: direct single-message ENQUEUE.
    const framePayload = encodeEnqueuePayload([{ queue, headers: headers ?? {}, payload }]);
    let resp;
    try {
      resp = await conn.request(Op.ENQUEUE, framePayload);
    } catch (err) {
      if (err instanceof RPCError) throw mapEnqueueWireError(err.code, err.detail);
      throw err;
    }
    const results = decodeEnqueueResponse(resp.payload);
    const result = results[0];
    if (!result) {
      throw new RPCError(ErrCode.INTERNAL, "no result from server");
    }
    if (result.ok) {
      return result.msgId;
    }
    throw mapEnqueueWireError(result.errCode, result.errMsg);
  }

  /**
   * Enqueue multiple messages in a single request.
   *
   * Each message is independently validated and processed. A failed message
   * does not affect the others. Returns one result per input message,
   * in the same order.
   *
   * This always bypasses the batcher and issues a direct ENQUEUE request.
   *
   * @param messages - Array of messages to enqueue.
   * @returns Per-message results (success with messageId, or error with description).
   * @throws {RPCError} For transport-level failures affecting the entire call.
   */
  async enqueueMany(messages: EnqueueMessage[]): Promise<EnqueueResult[]> {
    if (messages.length === 0) return [];
    const conn = await this.getConn();

    // Group by queue for the wire format (each queue is a separate frame).
    // Preserve insertion order for result mapping.
    const byQueue = new Map<string, Array<{ idx: number; msg: EnqueueMessage }>>();
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!byQueue.has(m.queue)) byQueue.set(m.queue, []);
      byQueue.get(m.queue)!.push({ idx: i, msg: m });
    }

    const resultArr: EnqueueResult[] = new Array(messages.length);

    for (const [, items] of byQueue) {
      const wireMessages = items.map((item) => ({
        queue: item.msg.queue,
        headers: item.msg.headers,
        payload: item.msg.payload,
      }));
      const framePayload = encodeEnqueuePayload(wireMessages);

      let resp;
      try {
        resp = await conn.request(Op.ENQUEUE, framePayload);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        for (const item of items) {
          resultArr[item.idx] = { success: false, error: errMsg };
        }
        continue;
      }

      const results = decodeEnqueueResponse(resp.payload);
      for (let i = 0; i < items.length; i++) {
        const result = results[i];
        if (!result) {
          resultArr[items[i].idx] = { success: false, error: "server returned fewer results than messages sent" };
          continue;
        }
        if (result.ok) {
          resultArr[items[i].idx] = { success: true, messageId: result.msgId };
        } else {
          resultArr[items[i].idx] = { success: false, error: result.errMsg };
        }
      }
    }

    return resultArr;
  }

  // ---- Consume --------------------------------------------------------------

  /**
   * Open a streaming consumer on the specified queue.
   *
   * Returns an async iterable that yields messages as they become available.
   * The server pushes delivery frames with the push flag set. Keepalive
   * (empty) frames are skipped automatically.
   *
   * If the server returns a leader-hint error, the client transparently
   * reconnects to the indicated leader node and retries once.
   *
   * @param queue - Queue to consume from.
   * @throws {QueueNotFoundError} If the queue does not exist.
   * @throws {UnauthenticatedError} If authentication fails.
   * @throws {RPCError} For unexpected protocol failures.
   */
  async *consume(queue: string): AsyncIterable<ConsumeMessage> {
    yield* this.consumeInner(queue);
  }

  private async *consumeInner(
    queue: string
  ): AsyncIterable<ConsumeMessage> {
    const conn = await this.getConn();

    const initialCredits = 256;
    const payload = encodeConsumePayload(queue, initialCredits);

    let cancel: (() => void) | undefined;
    try {
      const stream = await conn.openConsumeStream(payload);
      cancel = stream.cancel;

      for await (const frame of stream.iter) {
        const messages = decodeConsumeDelivery(frame.payload);
        for (const msg of messages) {
          yield {
            id: msg.id,
            headers: msg.headers,
            payload: msg.payload,
            fairnessKey: msg.fairnessKey,
            attemptCount: msg.attemptCount,
            queue,
          };
        }
      }
    } catch (err) {
      // Transport errors from the stream (e.g. ERROR frames) arrive as RPCError.
      // Remap to typed SDK errors where possible.
      if (err instanceof RPCError) {
        throw mapConsumeWireError(err.code, err.detail);
      }
      throw err;
    } finally {
      cancel?.();
    }
  }

  // ---- Ack ------------------------------------------------------------------

  /**
   * Acknowledge a successfully processed message.
   * @param queue - Queue the message belongs to.
   * @param msgId - ID of the message to acknowledge.
   * @throws {MessageNotFoundError} If the message does not exist.
   * @throws {UnauthenticatedError} If authentication fails.
   * @throws {RPCError} For unexpected protocol failures.
   */
  async ack(queue: string, msgId: string): Promise<void> {
    const conn = await this.getConn();
    const payload = encodeAckPayload(queue, msgId);
    let resp;
    try {
      resp = await conn.request(Op.ACK, payload);
    } catch (err) {
      if (err instanceof RPCError) throw mapAckWireError(err.code, err.detail);
      throw err;
    }
    const results = decodeAckNackResponse(resp.payload);
    const result = results[0];
    if (!result) {
      throw new RPCError(ErrCode.INTERNAL, "no result from server");
    }
    if (!result.ok) {
      throw mapAckWireError(result.errCode, result.errMsg);
    }
  }

  // ---- Nack -----------------------------------------------------------------

  /**
   * Negatively acknowledge a message that failed processing.
   * @param queue - Queue the message belongs to.
   * @param msgId - ID of the message to nack.
   * @param error - Description of the failure.
   * @throws {MessageNotFoundError} If the message does not exist.
   * @throws {UnauthenticatedError} If authentication fails.
   * @throws {RPCError} For unexpected protocol failures.
   */
  async nack(queue: string, msgId: string, error: string): Promise<void> {
    const conn = await this.getConn();
    const payload = encodeNackPayload(queue, msgId, error);
    let resp;
    try {
      resp = await conn.request(Op.NACK, payload);
    } catch (err) {
      if (err instanceof RPCError) throw mapNackWireError(err.code, err.detail);
      throw err;
    }
    const results = decodeAckNackResponse(resp.payload);
    const result = results[0];
    if (!result) {
      throw new RPCError(ErrCode.INTERNAL, "no result from server");
    }
    if (!result.ok) {
      throw mapNackWireError(result.errCode, result.errMsg);
    }
  }
}

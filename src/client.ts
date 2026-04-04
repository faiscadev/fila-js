import {
  Encoder,
  Decoder,
  OP_ENQUEUE,
  OP_ENQUEUE_RESULT,
  OP_CONSUME,
  OP_CONSUME_OK,
  OP_CANCEL_CONSUME,
  OP_ACK,
  OP_ACK_RESULT,
  OP_NACK,
  OP_NACK_RESULT,
  OP_ERROR,
  OP_CREATE_QUEUE,
  OP_CREATE_QUEUE_RESULT,
  OP_DELETE_QUEUE,
  OP_DELETE_QUEUE_RESULT,
  OP_GET_STATS,
  OP_GET_STATS_RESULT,
  OP_LIST_QUEUES,
  OP_LIST_QUEUES_RESULT,
  OP_SET_CONFIG,
  OP_SET_CONFIG_RESULT,
  OP_GET_CONFIG,
  OP_GET_CONFIG_RESULT,
  OP_LIST_CONFIG,
  OP_LIST_CONFIG_RESULT,
  OP_REDRIVE,
  OP_REDRIVE_RESULT,
  OP_CREATE_API_KEY,
  OP_CREATE_API_KEY_RESULT,
  OP_REVOKE_API_KEY,
  OP_REVOKE_API_KEY_RESULT,
  OP_LIST_API_KEYS,
  OP_LIST_API_KEYS_RESULT,
  OP_SET_ACL,
  OP_SET_ACL_RESULT,
  OP_GET_ACL,
  OP_GET_ACL_RESULT,
  ERR_OK,
} from "./fibp";
import type { Frame } from "./fibp";
import { Connection } from "./connection";
import type { ConnectionOptions } from "./connection";
import { Batcher, type BatchMode } from "./batcher";
import {
  FilaError,
  mapErrorCode,
  mapItemErrorCode,
  NotLeaderError,
  ProtocolError,
} from "./errors";
import type {
  ConsumeMessage,
  EnqueueMessage,
  EnqueueResult,
  QueueStats,
  QueueInfo,
  ApiKeyInfo,
  AclPermission,
} from "./types";

/** Connection options for TLS, authentication, and batching. */
export interface ClientOptions {
  /** Enable TLS using the OS system trust store. */
  tls?: boolean;
  /** CA certificate PEM for server verification. When set, enables TLS. */
  caCert?: Buffer;
  /** Client certificate PEM for mutual TLS (mTLS). */
  clientCert?: Buffer;
  /** Client private key PEM for mutual TLS (mTLS). */
  clientKey?: Buffer;
  /** API key for authentication. Sent in the FIBP handshake. */
  apiKey?: string;
  /**
   * Batch mode for enqueue() calls.
   * - 'auto' (DEFAULT): Opportunistic batching via setImmediate.
   * - 'linger': Timer-based batching with explicit lingerMs and batchSize.
   * - 'disabled': No batching. Each enqueue() is a direct request.
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

/** Parse "host:port" into components. Default port 5555. */
function parseAddr(addr: string): { host: string; port: number } {
  const lastColon = addr.lastIndexOf(":");
  if (lastColon === -1) return { host: addr, port: 5555 };
  const host = addr.substring(0, lastColon);
  const port = parseInt(addr.substring(lastColon + 1), 10);
  return { host, port: isNaN(port) ? 5555 : port };
}

/** Decode an Error frame payload into an SDK error. */
function decodeErrorFrame(frame: Frame): FilaError {
  const dec = new Decoder(frame.payload);
  const code = dec.readU8();
  const message = dec.readString();
  const metadata = dec.readMap();
  return mapErrorCode(code, message, metadata);
}

/** Check if a response frame is an Error frame and throw if so. */
function assertNotError(frame: Frame): void {
  if (frame.opcode === OP_ERROR) throw decodeErrorFrame(frame);
}

/**
 * Client for the Fila message broker using the FIBP binary protocol.
 *
 * @example
 * ```typescript
 * const client = new Client("localhost:5555");
 * await client.connect();
 * const msgId = await client.enqueue("my-queue", { tenant: "acme" }, Buffer.from("hello"));
 * for await (const msg of client.consume("my-queue")) {
 *   await client.ack("my-queue", msg.id);
 * }
 * await client.close();
 * ```
 */
export class Client {
  private conn: Connection;
  private readonly addr: string;
  private readonly connOpts: ConnectionOptions;
  private readonly batcher: Batcher | null;
  private readonly batchModeConfig: "auto" | "linger" | "disabled";
  private readonly clientOptions: ClientOptions;

  /**
   * Create a client for the given address. Call `connect()` to establish the connection.
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

    this.addr = addr;
    this.clientOptions = options ?? {};
    const { host, port } = parseAddr(addr);
    this.connOpts = {
      tls: options?.tls,
      caCert: options?.caCert,
      clientCert: options?.clientCert,
      clientKey: options?.clientKey,
      apiKey: options?.apiKey,
    };
    this.conn = new Connection(host, port, this.connOpts);

    this.batchModeConfig = options?.batchMode ?? "auto";
    if (this.batchModeConfig === "disabled") {
      this.batcher = null;
    } else {
      let batchMode: BatchMode;
      if (this.batchModeConfig === "linger") {
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
      this.batcher = new Batcher(this.conn, batchMode);
    }
  }

  /** Establish the TCP (+ optional TLS) connection and perform the FIBP handshake. */
  async connect(): Promise<void> {
    await this.conn.connect();
  }

  /** Close the client, draining any pending batched messages first. */
  async close(): Promise<void> {
    if (this.batcher) {
      await this.batcher.drain();
    }
    await this.conn.close();
  }

  // ---------------------------------------------------------------------------
  // Hot-path operations
  // ---------------------------------------------------------------------------

  /**
   * Enqueue a message to the specified queue.
   * When batching is enabled (default), the message is routed through the batcher.
   */
  enqueue(
    queue: string,
    headers: Record<string, string> | null,
    payload: Buffer
  ): Promise<string> {
    if (this.batcher) {
      return this.batcher.submit({ queue, headers: headers ?? {}, payload });
    }

    return this.enqueueDirect(queue, headers ?? {}, payload);
  }

  private async enqueueDirect(
    queue: string,
    headers: Record<string, string>,
    payload: Buffer
  ): Promise<string> {
    const enc = new Encoder(128);
    enc.writeU32(1); // message_count
    enc.writeString(queue);
    enc.writeMap(headers);
    enc.writeBytes(payload);

    const resp = await this.conn.sendRequest(OP_ENQUEUE, enc.finish());
    assertNotError(resp);

    if (resp.opcode !== OP_ENQUEUE_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const count = dec.readU32();
    if (count < 1) throw new ProtocolError(0xff, "no result from server");
    const errorCode = dec.readU8();
    const messageId = dec.readString();
    if (errorCode !== ERR_OK) {
      throw mapItemErrorCode(errorCode, "enqueue");
    }
    return messageId;
  }

  /**
   * Enqueue multiple messages in a single call.
   * Always bypasses the batcher.
   */
  async enqueueMany(messages: EnqueueMessage[]): Promise<EnqueueResult[]> {
    const enc = new Encoder(256);
    enc.writeU32(messages.length);
    for (const m of messages) {
      enc.writeString(m.queue);
      enc.writeMap(m.headers);
      enc.writeBytes(m.payload);
    }

    const resp = await this.conn.sendRequest(OP_ENQUEUE, enc.finish());

    if (resp.opcode === OP_ERROR) {
      throw decodeErrorFrame(resp);
    }

    if (resp.opcode !== OP_ENQUEUE_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const count = dec.readU32();
    const results: EnqueueResult[] = [];
    for (let i = 0; i < messages.length; i++) {
      if (i >= count) {
        results.push({ success: false, error: "server returned fewer results than messages sent" });
        continue;
      }
      const errorCode = dec.readU8();
      const messageId = dec.readString();
      if (errorCode === ERR_OK) {
        results.push({ success: true, messageId });
      } else {
        const name = errorCode.toString(16);
        results.push({ success: false, error: `error code 0x${name}: ${messageId || "unknown"}` });
      }
    }
    return results;
  }

  /**
   * Open a streaming consumer on the specified queue.
   * Returns an async iterable that yields messages as they become available.
   */
  async *consume(queue: string): AsyncIterable<ConsumeMessage> {
    yield* this.consumeInner(queue, false);
  }

  private async *consumeInner(
    queue: string,
    redirected: boolean
  ): AsyncIterable<ConsumeMessage> {
    const enc = new Encoder(64);
    enc.writeString(queue);

    const requestId = this.conn.allocRequestId();

    // Set up a queue for delivery frames.
    const deliveryQueue: Frame[] = [];
    let deliveryResolve: (() => void) | null = null;
    let streamClosed = false;

    this.conn.registerConsumeHandler(requestId, (frame) => {
      if (frame.opcode === 0 && frame.payload.length === 0) {
        // Connection closed signal.
        streamClosed = true;
        if (deliveryResolve) {
          deliveryResolve();
          deliveryResolve = null;
        }
        return;
      }
      deliveryQueue.push(frame);
      if (deliveryResolve) {
        deliveryResolve();
        deliveryResolve = null;
      }
    });

    try {
      // Send Consume request and wait for ConsumeOk.
      const consumeResp = await this.conn.sendRequestWithId(
        OP_CONSUME, requestId, enc.finish()
      );

      if (consumeResp.opcode === OP_ERROR) {
        const err = decodeErrorFrame(consumeResp);
        if (!redirected && err instanceof NotLeaderError && err.leaderAddr) {
          // Follow leader hint.
          this.conn.unregisterConsumeHandler(requestId);
          yield* this.consumeFromLeader(queue, err.leaderAddr);
          return;
        }
        throw err;
      }

      if (consumeResp.opcode !== OP_CONSUME_OK) {
        throw new ProtocolError(0xff, `unexpected consume response: 0x${consumeResp.opcode.toString(16)}`);
      }

      // Now yield deliveries until stream closes.
      while (!streamClosed && !this.conn.isClosed) {
        if (deliveryQueue.length === 0) {
          await new Promise<void>((resolve) => {
            deliveryResolve = resolve;
          });
        }

        while (deliveryQueue.length > 0) {
          const frame = deliveryQueue.shift()!;
          const messages = decodeDelivery(frame);
          for (const msg of messages) {
            yield msg;
          }
        }
      }
    } finally {
      // Send CancelConsume.
      this.conn.sendFireAndForget(OP_CANCEL_CONSUME, requestId, Buffer.alloc(0));
      this.conn.unregisterConsumeHandler(requestId);
    }
  }

  private async *consumeFromLeader(
    queue: string,
    leaderAddr: string
  ): AsyncIterable<ConsumeMessage> {
    const { host, port } = parseAddr(leaderAddr);
    const leaderConn = new Connection(host, port, this.connOpts);
    try {
      await leaderConn.connect();
      const enc = new Encoder(64);
      enc.writeString(queue);
      const requestId = leaderConn.allocRequestId();

      const deliveryQueue: Frame[] = [];
      let deliveryResolve: (() => void) | null = null;
      let streamClosed = false;

      leaderConn.registerConsumeHandler(requestId, (frame) => {
        if (frame.opcode === 0 && frame.payload.length === 0) {
          streamClosed = true;
          if (deliveryResolve) {
            deliveryResolve();
            deliveryResolve = null;
          }
          return;
        }
        deliveryQueue.push(frame);
        if (deliveryResolve) {
          deliveryResolve();
          deliveryResolve = null;
        }
      });

      const consumeResp = await leaderConn.sendRequestWithId(
        OP_CONSUME, requestId, enc.finish()
      );
      assertNotError(consumeResp);

      while (!streamClosed && !leaderConn.isClosed) {
        if (deliveryQueue.length === 0) {
          await new Promise<void>((resolve) => {
            deliveryResolve = resolve;
          });
        }
        while (deliveryQueue.length > 0) {
          const frame = deliveryQueue.shift()!;
          const messages = decodeDelivery(frame);
          for (const msg of messages) {
            yield msg;
          }
        }
      }

      leaderConn.sendFireAndForget(OP_CANCEL_CONSUME, requestId, Buffer.alloc(0));
      leaderConn.unregisterConsumeHandler(requestId);
    } finally {
      await leaderConn.close();
    }
  }

  /**
   * Acknowledge a successfully processed message.
   */
  async ack(queue: string, msgId: string): Promise<void> {
    const enc = new Encoder(64);
    enc.writeU32(1); // item_count
    enc.writeString(queue);
    enc.writeString(msgId);

    const resp = await this.conn.sendRequest(OP_ACK, enc.finish());
    assertNotError(resp);

    if (resp.opcode !== OP_ACK_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const count = dec.readU32();
    if (count < 1) throw new ProtocolError(0xff, "no result from server");
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) {
      throw mapItemErrorCode(errorCode, "ack");
    }
  }

  /**
   * Negatively acknowledge a message that failed processing.
   */
  async nack(queue: string, msgId: string, error: string): Promise<void> {
    const enc = new Encoder(64);
    enc.writeU32(1); // item_count
    enc.writeString(queue);
    enc.writeString(msgId);
    enc.writeString(error);

    const resp = await this.conn.sendRequest(OP_NACK, enc.finish());
    assertNotError(resp);

    if (resp.opcode !== OP_NACK_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const count = dec.readU32();
    if (count < 1) throw new ProtocolError(0xff, "no result from server");
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) {
      throw mapItemErrorCode(errorCode, "nack");
    }
  }

  // ---------------------------------------------------------------------------
  // Admin operations
  // ---------------------------------------------------------------------------

  /** Create a queue with optional scripts and visibility timeout. */
  async createQueue(
    name: string,
    opts?: {
      onEnqueueScript?: string;
      onFailureScript?: string;
      visibilityTimeoutMs?: number;
    }
  ): Promise<string> {
    const enc = new Encoder(128);
    enc.writeString(name);
    enc.writeOptionalString(opts?.onEnqueueScript ?? null);
    enc.writeOptionalString(opts?.onFailureScript ?? null);
    enc.writeU64(BigInt(opts?.visibilityTimeoutMs ?? 0));

    const resp = await this.conn.sendRequest(OP_CREATE_QUEUE, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_CREATE_QUEUE_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    const queueId = dec.readString();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "createQueue");
    return queueId;
  }

  /** Delete a queue. */
  async deleteQueue(queue: string): Promise<void> {
    const enc = new Encoder(64);
    enc.writeString(queue);

    const resp = await this.conn.sendRequest(OP_DELETE_QUEUE, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_DELETE_QUEUE_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "deleteQueue");
  }

  /** Get queue statistics. */
  async getStats(queue: string): Promise<QueueStats> {
    const enc = new Encoder(64);
    enc.writeString(queue);

    const resp = await this.conn.sendRequest(OP_GET_STATS, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_GET_STATS_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "getStats");

    const depth = dec.readU64();
    const inFlight = dec.readU64();
    const activeFairnessKeys = dec.readU64();
    const activeConsumers = dec.readU32();
    const quantum = dec.readU32();
    const leaderNodeId = dec.readU64();
    const replicationCount = dec.readU32();

    const perKeyCount = dec.readU16();
    const perKeyStats = [];
    for (let i = 0; i < perKeyCount; i++) {
      perKeyStats.push({
        key: dec.readString(),
        pendingCount: dec.readU64(),
        currentDeficit: dec.readI64(),
        weight: dec.readU32(),
      });
    }

    const perThrottleCount = dec.readU16();
    const perThrottleStats = [];
    for (let i = 0; i < perThrottleCount; i++) {
      perThrottleStats.push({
        key: dec.readString(),
        tokens: dec.readF64(),
        ratePerSecond: dec.readF64(),
        burst: dec.readF64(),
      });
    }

    return {
      depth,
      inFlight,
      activeFairnessKeys,
      activeConsumers,
      quantum,
      leaderNodeId,
      replicationCount,
      perKeyStats,
      perThrottleStats,
    };
  }

  /** List all queues. */
  async listQueues(): Promise<{ clusterNodeCount: number; queues: QueueInfo[] }> {
    const resp = await this.conn.sendRequest(OP_LIST_QUEUES, Buffer.alloc(0));
    assertNotError(resp);
    if (resp.opcode !== OP_LIST_QUEUES_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "listQueues");

    const clusterNodeCount = dec.readU32();
    const queueCount = dec.readU16();
    const queues: QueueInfo[] = [];
    for (let i = 0; i < queueCount; i++) {
      queues.push({
        name: dec.readString(),
        depth: dec.readU64(),
        inFlight: dec.readU64(),
        activeConsumers: dec.readU32(),
        leaderNodeId: dec.readU64(),
      });
    }
    return { clusterNodeCount, queues };
  }

  /** Set a runtime config key. */
  async setConfig(key: string, value: string): Promise<void> {
    const enc = new Encoder(64);
    enc.writeString(key);
    enc.writeString(value);

    const resp = await this.conn.sendRequest(OP_SET_CONFIG, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_SET_CONFIG_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "setConfig");
  }

  /** Get a runtime config value. */
  async getConfig(key: string): Promise<string> {
    const enc = new Encoder(64);
    enc.writeString(key);

    const resp = await this.conn.sendRequest(OP_GET_CONFIG, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_GET_CONFIG_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "getConfig");
    return dec.readString();
  }

  /** List config keys by prefix. */
  async listConfig(prefix: string): Promise<Array<{ key: string; value: string }>> {
    const enc = new Encoder(64);
    enc.writeString(prefix);

    const resp = await this.conn.sendRequest(OP_LIST_CONFIG, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_LIST_CONFIG_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "listConfig");

    const count = dec.readU16();
    const entries = [];
    for (let i = 0; i < count; i++) {
      entries.push({ key: dec.readString(), value: dec.readString() });
    }
    return entries;
  }

  /** Redrive messages from a DLQ back to the parent queue. */
  async redrive(dlqQueue: string, count: bigint): Promise<bigint> {
    const enc = new Encoder(64);
    enc.writeString(dlqQueue);
    enc.writeU64(count);

    const resp = await this.conn.sendRequest(OP_REDRIVE, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_REDRIVE_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "redrive");
    return dec.readU64();
  }

  // ---------------------------------------------------------------------------
  // Auth operations
  // ---------------------------------------------------------------------------

  /** Create an API key. */
  async createApiKey(
    name: string,
    opts?: { expiresAtMs?: bigint; isSuperadmin?: boolean }
  ): Promise<{ keyId: string; key: string; isSuperadmin: boolean }> {
    const enc = new Encoder(64);
    enc.writeString(name);
    enc.writeU64(opts?.expiresAtMs ?? BigInt(0));
    enc.writeBool(opts?.isSuperadmin ?? false);

    const resp = await this.conn.sendRequest(OP_CREATE_API_KEY, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_CREATE_API_KEY_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "createApiKey");
    const keyId = dec.readString();
    const key = dec.readString();
    const isSuperadmin = dec.readBool();
    return { keyId, key, isSuperadmin };
  }

  /** Revoke an API key. */
  async revokeApiKey(keyId: string): Promise<void> {
    const enc = new Encoder(64);
    enc.writeString(keyId);

    const resp = await this.conn.sendRequest(OP_REVOKE_API_KEY, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_REVOKE_API_KEY_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "revokeApiKey");
  }

  /** List all API keys. */
  async listApiKeys(): Promise<ApiKeyInfo[]> {
    const resp = await this.conn.sendRequest(OP_LIST_API_KEYS, Buffer.alloc(0));
    assertNotError(resp);
    if (resp.opcode !== OP_LIST_API_KEYS_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "listApiKeys");

    const count = dec.readU16();
    const keys: ApiKeyInfo[] = [];
    for (let i = 0; i < count; i++) {
      keys.push({
        keyId: dec.readString(),
        name: dec.readString(),
        createdAtMs: dec.readU64(),
        expiresAtMs: dec.readU64(),
        isSuperadmin: dec.readBool(),
      });
    }
    return keys;
  }

  /** Set ACL permissions for an API key. */
  async setAcl(keyId: string, permissions: AclPermission[]): Promise<void> {
    const enc = new Encoder(128);
    enc.writeString(keyId);
    enc.writeU16(permissions.length);
    for (const p of permissions) {
      enc.writeString(p.kind);
      enc.writeString(p.pattern);
    }

    const resp = await this.conn.sendRequest(OP_SET_ACL, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_SET_ACL_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "setAcl");
  }

  /** Get ACL permissions for an API key. */
  async getAcl(keyId: string): Promise<{
    keyId: string;
    isSuperadmin: boolean;
    permissions: AclPermission[];
  }> {
    const enc = new Encoder(64);
    enc.writeString(keyId);

    const resp = await this.conn.sendRequest(OP_GET_ACL, enc.finish());
    assertNotError(resp);
    if (resp.opcode !== OP_GET_ACL_RESULT) {
      throw new ProtocolError(0xff, `unexpected opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    const errorCode = dec.readU8();
    if (errorCode !== ERR_OK) throw mapItemErrorCode(errorCode, "getAcl");

    const resultKeyId = dec.readString();
    const isSuperadmin = dec.readBool();
    const permCount = dec.readU16();
    const permissions: AclPermission[] = [];
    for (let i = 0; i < permCount; i++) {
      permissions.push({
        kind: dec.readString(),
        pattern: dec.readString(),
      });
    }
    return { keyId: resultKeyId, isSuperadmin, permissions };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeDelivery(frame: Frame): ConsumeMessage[] {
  const dec = new Decoder(frame.payload);
  const count = dec.readU32();
  const messages: ConsumeMessage[] = [];

  for (let i = 0; i < count; i++) {
    const id = dec.readString();
    const queue = dec.readString();
    const headers = dec.readMap();
    const payload = dec.readBytes();
    const fairnessKey = dec.readString();
    const weight = dec.readU32();
    const throttleKeys = dec.readStringArray();
    const attemptCount = dec.readU32();
    const enqueuedAt = dec.readU64();
    const leasedAt = dec.readU64();

    messages.push({
      id,
      queue,
      headers,
      payload: Buffer.from(payload),
      fairnessKey,
      weight,
      throttleKeys,
      attemptCount,
      enqueuedAt,
      leasedAt,
    });
  }

  return messages;
}

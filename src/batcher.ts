import {
  Encoder,
  Decoder,
  OP_ENQUEUE,
  OP_ENQUEUE_RESULT,
  OP_ERROR,
  ERR_OK,
} from "./fibp";
import { ProtocolError, mapErrorCode, mapItemErrorCode } from "./errors";
import type { EnqueueMessage } from "./types";
import type { Connection } from "./connection";

/** Controls how the SDK batches enqueue() calls. */
export type BatchMode =
  | { mode: "auto"; maxBatchSize?: number }
  | { mode: "linger"; lingerMs: number; batchSize: number }
  | { mode: "disabled" };

/** A queued enqueue item awaiting batch flush. */
interface BatchItem {
  message: EnqueueMessage;
  resolve: (messageId: string) => void;
  reject: (err: Error) => void;
}

/**
 * Background batcher that collects enqueue() calls and flushes them
 * via the FIBP Enqueue opcode (batch-native).
 * Supports auto (opportunistic) and linger (timer-based) modes.
 */
export class Batcher {
  private readonly conn: Connection;
  private readonly batchMode: BatchMode;
  private readonly maxBatchSize: number;

  private pending: BatchItem[] = [];
  private flushScheduled = false;
  private closed = false;
  private drainResolvers: Array<() => void> = [];
  private lingerTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlightCount = 0;

  constructor(conn: Connection, batchMode: BatchMode) {
    this.conn = conn;
    this.batchMode = batchMode;

    if (batchMode.mode === "auto") {
      this.maxBatchSize = batchMode.maxBatchSize ?? 100;
    } else if (batchMode.mode === "linger") {
      this.maxBatchSize = batchMode.batchSize;
    } else {
      this.maxBatchSize = 1;
    }
  }

  /** Submit a message for batched enqueue. */
  submit(message: EnqueueMessage): Promise<string> {
    if (this.closed) {
      return Promise.reject(new ProtocolError(0xff, "batcher is closed"));
    }

    return new Promise<string>((resolve, reject) => {
      this.pending.push({ message, resolve, reject });
      this.scheduleFlush();
    });
  }

  /** Drain all pending messages before closing. */
  async drain(): Promise<void> {
    this.closed = true;

    if (this.lingerTimer !== null) {
      clearTimeout(this.lingerTimer);
      this.lingerTimer = null;
    }

    if (this.pending.length === 0 && this.inFlightCount === 0) {
      return;
    }

    return new Promise<void>((resolve) => {
      this.drainResolvers.push(resolve);
      this.flushAll();
    });
  }

  private scheduleFlush(): void {
    if (this.batchMode.mode === "auto") {
      this.scheduleAutoFlush();
    } else if (this.batchMode.mode === "linger") {
      this.scheduleLingerFlush();
    }
  }

  private scheduleAutoFlush(): void {
    if (this.flushScheduled) return;
    this.flushScheduled = true;

    setImmediate(() => {
      this.flushScheduled = false;
      this.flushAll();
    });
  }

  private scheduleLingerFlush(): void {
    if (this.batchMode.mode !== "linger") return;

    if (this.pending.length >= this.batchMode.batchSize) {
      if (this.lingerTimer !== null) {
        clearTimeout(this.lingerTimer);
        this.lingerTimer = null;
      }
      this.flushAll();
      return;
    }

    if (this.lingerTimer === null) {
      this.lingerTimer = setTimeout(() => {
        this.lingerTimer = null;
        this.flushAll();
      }, this.batchMode.lingerMs);
    }
  }

  private flushAll(): void {
    while (this.pending.length > 0) {
      const items = this.pending.splice(0, this.maxBatchSize);
      this.inFlightCount++;
      this.flushBatch(items).then(() => {
        this.inFlightCount--;
        this.notifyDrainComplete();
      });
    }
    this.notifyDrainComplete();
  }

  private notifyDrainComplete(): void {
    if (this.pending.length === 0 && this.inFlightCount === 0 && this.drainResolvers.length > 0) {
      const resolvers = this.drainResolvers.splice(0);
      for (const resolve of resolvers) {
        resolve();
      }
    }
  }

  private async flushBatch(items: BatchItem[]): Promise<void> {
    if (items.length === 0) return;

    const enc = new Encoder(256);
    enc.writeU32(items.length);
    for (const item of items) {
      enc.writeString(item.message.queue);
      enc.writeMap(item.message.headers);
      enc.writeBytes(item.message.payload);
    }

    try {
      const resp = await this.conn.sendRequest(OP_ENQUEUE, enc.finish());

      if (resp.opcode === OP_ERROR) {
        const dec = new Decoder(resp.payload);
        const errorCode = dec.readU8();
        const message = dec.readString();
        const metadata = dec.readMap();
        const err = mapErrorCode(errorCode, message, metadata);
        for (const item of items) {
          item.reject(err);
        }
        return;
      }

      if (resp.opcode !== OP_ENQUEUE_RESULT) {
        const err = new ProtocolError(0xff, `unexpected response opcode: 0x${resp.opcode.toString(16)}`);
        for (const item of items) {
          item.reject(err);
        }
        return;
      }

      const dec = new Decoder(resp.payload);
      const count = dec.readU32();
      for (let i = 0; i < items.length; i++) {
        if (i >= count) {
          items[i].reject(new ProtocolError(0xff, "server returned fewer results than messages sent"));
          continue;
        }
        const errorCode = dec.readU8();
        const messageId = dec.readString();
        if (errorCode === ERR_OK) {
          items[i].resolve(messageId);
        } else {
          items[i].reject(mapItemErrorCode(errorCode, "enqueue"));
        }
      }
    } catch (err) {
      for (const item of items) {
        item.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }
}

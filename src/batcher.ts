import {
  QueueNotFoundError,
  RPCError,
  UnauthenticatedError,
} from "./errors";
import type { EnqueueMessage } from "./types";
import {
  FibpConnection,
  Op,
  ErrCode,
  encodeEnqueuePayload,
  decodeEnqueueResponse,
} from "./transport";

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

function mapEnqueueWireError(errCode: number, errMsg: string): Error {
  switch (errCode) {
    case ErrCode.QUEUE_NOT_FOUND:
      return new QueueNotFoundError(`enqueue: ${errMsg}`);
    case ErrCode.UNAUTHORIZED:
      return new UnauthenticatedError(`enqueue: ${errMsg}`);
    default:
      return new RPCError(errCode, errMsg);
  }
}

/**
 * Background batcher that collects enqueue() calls and flushes them
 * via the FIBP ENQUEUE op (which accepts repeated messages per queue).
 * Supports auto (opportunistic) and linger (timer-based) modes.
 */
export class Batcher {
  private readonly getConn: () => FibpConnection;
  private readonly batchMode: BatchMode;
  private readonly maxBatchSize: number;

  private pending: BatchItem[] = [];
  private flushScheduled = false;
  private closed = false;
  private drainResolvers: Array<() => void> = [];
  private lingerTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlightCount = 0;

  constructor(
    getConn: () => FibpConnection,
    batchMode: BatchMode
  ) {
    this.getConn = getConn;
    this.batchMode = batchMode;

    if (batchMode.mode === "auto") {
      this.maxBatchSize = batchMode.maxBatchSize ?? 100;
    } else if (batchMode.mode === "linger") {
      this.maxBatchSize = batchMode.batchSize;
    } else {
      this.maxBatchSize = 1;
    }
  }

  /**
   * Submit a message for batched enqueue. Returns a promise that resolves
   * with the message ID when the batch containing this message is flushed.
   */
  submit(message: EnqueueMessage): Promise<string> {
    if (this.closed) {
      return Promise.reject(
        new RPCError(ErrCode.INTERNAL, "batcher is closed")
      );
    }

    return new Promise<string>((resolve, reject) => {
      this.pending.push({ message, resolve, reject });
      this.scheduleFlush();
    });
  }

  /**
   * Drain all pending messages before closing. Returns a promise that
   * resolves when all pending messages have been flushed.
   */
  async drain(): Promise<void> {
    this.closed = true;

    if (this.lingerTimer !== null) {
      clearTimeout(this.lingerTimer);
      this.lingerTimer = null;
    }

    if (this.pending.length === 0) {
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

  /**
   * Auto mode: schedule a flush via setImmediate. Messages that arrive
   * within the same event loop turn will cluster into the same batch.
   */
  private scheduleAutoFlush(): void {
    if (this.flushScheduled) return;
    this.flushScheduled = true;

    setImmediate(() => {
      this.flushScheduled = false;
      this.flushAll();
    });
  }

  /**
   * Linger mode: start a timer on the first message. Flush when the batch
   * fills or the timer fires, whichever comes first.
   */
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

  /** Flush all pending items, splitting into maxBatchSize chunks. */
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

  /**
   * Flush a batch of items via FIBP ENQUEUE.
   * Items for the same queue are sent in a single frame.
   * Items for different queues are sent as separate frames (sequentially).
   */
  private async flushBatch(items: BatchItem[]): Promise<void> {
    if (items.length === 0) return;

    // Group by queue to preserve per-queue batch semantics.
    const byQueue = new Map<string, BatchItem[]>();
    for (const item of items) {
      const q = item.message.queue;
      if (!byQueue.has(q)) byQueue.set(q, []);
      byQueue.get(q)!.push(item);
    }

    for (const [, queueItems] of byQueue) {
      await this.flushQueueBatch(queueItems);
    }
  }

  private async flushQueueBatch(items: BatchItem[]): Promise<void> {
    const messages = items.map((item) => ({
      queue: item.message.queue,
      headers: item.message.headers,
      payload: item.message.payload,
    }));

    let respFrame;
    try {
      const conn = this.getConn();
      const payload = encodeEnqueuePayload(messages);
      respFrame = await conn.request(Op.ENQUEUE, payload);
    } catch (err) {
      // Transport-level failure: all items in this batch get the error.
      const mapped = err instanceof Error ? err : new RPCError(ErrCode.INTERNAL, String(err));
      for (const item of items) {
        item.reject(mapped);
      }
      return;
    }

    const results = decodeEnqueueResponse(respFrame.payload);
    for (let i = 0; i < items.length; i++) {
      const result = results[i];
      if (!result) {
        items[i].reject(new RPCError(ErrCode.INTERNAL, "server returned fewer results than messages sent"));
        continue;
      }
      if (result.ok) {
        items[i].resolve(result.msgId);
      } else {
        items[i].reject(mapEnqueueWireError(result.errCode, result.errMsg));
      }
    }
  }
}

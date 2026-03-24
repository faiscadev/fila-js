import * as grpc from "@grpc/grpc-js";

import { QueueNotFoundError, RPCError } from "./errors";
import type { EnqueueMessage } from "./types";
import type { FilaServiceClient } from "../generated/fila/v1/FilaService";
import type { EnqueueResponse__Output } from "../generated/fila/v1/EnqueueResponse";
import type { BatchEnqueueResponse__Output } from "../generated/fila/v1/BatchEnqueueResponse";

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

function mapEnqueueError(err: grpc.ServiceError): Error {
  if (err.code === grpc.status.NOT_FOUND) {
    return new QueueNotFoundError(`enqueue: ${err.details}`);
  }
  return new RPCError(err.code, err.details);
}

/**
 * Background batcher that collects enqueue() calls and flushes them
 * as batch RPCs. Supports auto (opportunistic) and linger (timer-based) modes.
 */
export class Batcher {
  private readonly grpcClient: FilaServiceClient;
  private readonly callMetadata: () => grpc.Metadata;
  private readonly batchMode: BatchMode;
  private readonly maxBatchSize: number;

  private pending: BatchItem[] = [];
  private flushScheduled = false;
  private closed = false;
  private drainResolvers: Array<() => void> = [];
  private lingerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    grpcClient: FilaServiceClient,
    callMetadata: () => grpc.Metadata,
    batchMode: BatchMode
  ) {
    this.grpcClient = grpcClient;
    this.callMetadata = callMetadata;
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
        new RPCError(grpc.status.UNAVAILABLE, "batcher is closed")
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
   * At low load, each message is sent individually. At high load,
   * messages naturally batch together.
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

    // If batch is full, flush immediately.
    if (this.pending.length >= this.batchMode.batchSize) {
      if (this.lingerTimer !== null) {
        clearTimeout(this.lingerTimer);
        this.lingerTimer = null;
      }
      this.flushAll();
      return;
    }

    // Start timer if not already running.
    if (this.lingerTimer === null) {
      this.lingerTimer = setTimeout(() => {
        this.lingerTimer = null;
        this.flushAll();
      }, this.batchMode.lingerMs);
    }
  }

  /**
   * Flush all pending items, splitting into maxBatchSize chunks.
   */
  private flushAll(): void {
    while (this.pending.length > 0) {
      const items = this.pending.splice(0, this.maxBatchSize);
      // Fire-and-forget: flush concurrently.
      this.flushBatch(items).then(() => {
        this.notifyDrainComplete();
      });
    }
    // Also check drain in case pending was already empty.
    this.notifyDrainComplete();
  }

  private notifyDrainComplete(): void {
    if (this.pending.length === 0 && this.drainResolvers.length > 0) {
      const resolvers = this.drainResolvers.splice(0);
      for (const resolve of resolvers) {
        resolve();
      }
    }
  }

  /**
   * Flush a batch of items. Single item uses Enqueue RPC (preserves error
   * types like QueueNotFoundError). Multiple items use BatchEnqueue.
   */
  private async flushBatch(items: BatchItem[]): Promise<void> {
    if (items.length === 0) return;

    if (items.length === 1) {
      return this.flushSingle(items[0]);
    }

    return this.flushMultiple(items);
  }

  /** Flush a single item via the regular Enqueue RPC. */
  private flushSingle(item: BatchItem): Promise<void> {
    return new Promise<void>((resolve) => {
      this.grpcClient.enqueue(
        {
          queue: item.message.queue,
          headers: item.message.headers,
          payload: item.message.payload,
        },
        this.callMetadata(),
        (err: grpc.ServiceError | null, resp?: EnqueueResponse__Output) => {
          if (err) {
            item.reject(mapEnqueueError(err));
          } else {
            item.resolve(resp!.messageId);
          }
          resolve();
        }
      );
    });
  }

  /** Flush multiple items via the BatchEnqueue RPC. */
  private flushMultiple(items: BatchItem[]): Promise<void> {
    const messages = items.map((item) => ({
      queue: item.message.queue,
      headers: item.message.headers,
      payload: item.message.payload,
    }));

    return new Promise<void>((resolve) => {
      this.grpcClient.batchEnqueue(
        { messages },
        this.callMetadata(),
        (
          err: grpc.ServiceError | null,
          resp?: BatchEnqueueResponse__Output
        ) => {
          if (err) {
            // Transport-level failure: all items get the error.
            const mapped = new RPCError(err.code, err.details);
            for (const item of items) {
              item.reject(mapped);
            }
          } else {
            const results = resp!.results;
            for (let i = 0; i < items.length; i++) {
              const result = results[i];
              if (!result) {
                items[i].reject(
                  new RPCError(
                    grpc.status.INTERNAL,
                    "server returned fewer results than messages sent"
                  )
                );
                continue;
              }
              if (result.result === "success" && result.success) {
                items[i].resolve(result.success.messageId!);
              } else if (result.result === "error" && result.error) {
                items[i].reject(
                  new RPCError(grpc.status.INTERNAL, result.error)
                );
              } else {
                items[i].reject(
                  new RPCError(grpc.status.INTERNAL, "no result from server")
                );
              }
            }
          }
          resolve();
        }
      );
    });
  }

}

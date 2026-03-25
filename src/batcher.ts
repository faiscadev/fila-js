import * as grpc from "@grpc/grpc-js";

import { QueueNotFoundError, RPCError } from "./errors";
import type { EnqueueMessage } from "./types";
import type { FilaServiceClient } from "../generated/fila/v1/FilaService";
import type { EnqueueResponse__Output } from "../generated/fila/v1/EnqueueResponse";

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
 * Map a per-message EnqueueResult error to an SDK error.
 * The unified proto uses typed EnqueueError with an error code.
 */
function mapResultError(code: string, message: string): Error {
  if (code === "ENQUEUE_ERROR_CODE_QUEUE_NOT_FOUND") {
    return new QueueNotFoundError(`enqueue: ${message}`);
  }
  return new RPCError(grpc.status.INTERNAL, message);
}

function mapTransportError(err: grpc.ServiceError): Error {
  if (err.code === grpc.status.NOT_FOUND) {
    return new QueueNotFoundError(`enqueue: ${err.details}`);
  }
  return new RPCError(err.code, err.details);
}

/**
 * Background batcher that collects enqueue() calls and flushes them
 * via the unified Enqueue RPC (which accepts repeated messages).
 * Supports auto (opportunistic) and linger (timer-based) modes.
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
  private inFlightCount = 0;

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
      this.inFlightCount++;
      this.flushBatch(items).then(() => {
        this.inFlightCount--;
        this.notifyDrainComplete();
      });
    }
    // Also check drain in case pending was already empty and nothing in-flight.
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
   * Flush a batch of items via the unified Enqueue RPC (repeated messages).
   * All items -- single or multiple -- use the same RPC.
   */
  private flushBatch(items: BatchItem[]): Promise<void> {
    if (items.length === 0) return Promise.resolve();

    const messages = items.map((item) => ({
      queue: item.message.queue,
      headers: item.message.headers,
      payload: item.message.payload,
    }));

    return new Promise<void>((resolve) => {
      this.grpcClient.enqueue(
        { messages },
        this.callMetadata(),
        (err: grpc.ServiceError | null, resp?: EnqueueResponse__Output) => {
          if (err) {
            // Transport-level failure: all items get the error.
            const mapped = mapTransportError(err);
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
              if (result.result === "messageId" && result.messageId) {
                items[i].resolve(result.messageId);
              } else if (result.result === "error" && result.error) {
                items[i].reject(
                  mapResultError(result.error.code, result.error.message)
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

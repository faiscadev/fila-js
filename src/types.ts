/** A message received from the broker via a consume stream. */
export interface ConsumeMessage {
  /** Broker-assigned message ID (UUIDv7). */
  id: string;
  /** Message headers. */
  headers: Record<string, string>;
  /** Message payload bytes. */
  payload: Buffer;
  /** Fairness key for scheduling. */
  fairnessKey: string;
  /** Number of previous delivery attempts. */
  attemptCount: number;
  /** Queue the message belongs to. */
  queue: string;
  /** Message weight. */
  weight: number;
  /** Throttle keys. */
  throttleKeys: string[];
  /** Enqueued-at timestamp (Unix ms). */
  enqueuedAt: bigint;
  /** Leased-at timestamp (Unix ms, 0 if unavailable). */
  leasedAt: bigint;
}

/** A single message specification for enqueue operations. */
export interface EnqueueMessage {
  /** Target queue name. */
  queue: string;
  /** Message headers (key-value pairs). */
  headers: Record<string, string>;
  /** Message payload bytes. */
  payload: Buffer;
}

/** The result of a single message within an enqueue call. */
export type EnqueueResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

/** Queue statistics returned by getStats(). */
export interface QueueStats {
  depth: bigint;
  inFlight: bigint;
  activeFairnessKeys: bigint;
  activeConsumers: number;
  quantum: number;
  leaderNodeId: bigint;
  replicationCount: number;
  perKeyStats: Array<{
    key: string;
    pendingCount: bigint;
    currentDeficit: bigint;
    weight: number;
  }>;
  perThrottleStats: Array<{
    key: string;
    tokens: number;
    ratePerSecond: number;
    burst: number;
  }>;
}

/** Queue info returned by listQueues(). */
export interface QueueInfo {
  name: string;
  depth: bigint;
  inFlight: bigint;
  activeConsumers: number;
  leaderNodeId: bigint;
}

/** API key info returned by listApiKeys(). */
export interface ApiKeyInfo {
  keyId: string;
  name: string;
  createdAtMs: bigint;
  expiresAtMs: bigint;
  isSuperadmin: boolean;
}

/** ACL permission. */
export interface AclPermission {
  kind: string;
  pattern: string;
}

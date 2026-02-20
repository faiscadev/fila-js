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
}

import {
  ERR_QUEUE_NOT_FOUND,
  ERR_MESSAGE_NOT_FOUND,
  ERR_QUEUE_ALREADY_EXISTS,
  ERR_LUA_COMPILATION_ERROR,
  ERR_STORAGE_ERROR,
  ERR_NOT_A_DLQ,
  ERR_PARENT_QUEUE_NOT_FOUND,
  ERR_INVALID_CONFIG_VALUE,
  ERR_CHANNEL_FULL,
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_LEADER,
  ERR_UNSUPPORTED_VERSION,
  ERR_INVALID_FRAME,
  ERR_API_KEY_NOT_FOUND,
  ERR_NODE_NOT_READY,
  ERR_INTERNAL_ERROR,
  ERROR_CODE_NAMES,
} from "./fibp";

/** Base error for all Fila SDK errors. */
export class FilaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FilaError";
  }
}

/** Raised when the specified queue does not exist. */
export class QueueNotFoundError extends FilaError {
  constructor(message: string) {
    super(message);
    this.name = "QueueNotFoundError";
  }
}

/** Raised when the specified message does not exist. */
export class MessageNotFoundError extends FilaError {
  constructor(message: string) {
    super(message);
    this.name = "MessageNotFoundError";
  }
}

/** Raised when attempting to create a queue that already exists. */
export class QueueAlreadyExistsError extends FilaError {
  constructor(message: string) {
    super(message);
    this.name = "QueueAlreadyExistsError";
  }
}

/** Raised when missing or invalid API key. */
export class UnauthorizedError extends FilaError {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Raised when the API key lacks required permissions. */
export class ForbiddenError extends FilaError {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Raised when the contacted node is not the leader for the queue. */
export class NotLeaderError extends FilaError {
  /** Address of the current leader, if provided by the server. */
  public readonly leaderAddr?: string;

  constructor(message: string, leaderAddr?: string) {
    super(message);
    this.name = "NotLeaderError";
    this.leaderAddr = leaderAddr;
  }
}

/** Raised when the API key ID is not found. */
export class ApiKeyNotFoundError extends FilaError {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyNotFoundError";
  }
}

/** Raised when the server is overloaded. */
export class ChannelFullError extends FilaError {
  public readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = "ChannelFullError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** Raised for protocol-level errors with an error code. */
export class ProtocolError extends FilaError {
  public readonly code: number;
  public readonly metadata: Record<string, string>;

  constructor(code: number, message: string, metadata: Record<string, string> = {}) {
    super(`protocol error (${ERROR_CODE_NAMES[code] ?? `0x${code.toString(16)}`}): ${message}`);
    this.name = "ProtocolError";
    this.code = code;
    this.metadata = metadata;
  }
}

/**
 * Map a FIBP error code + message + metadata into the appropriate SDK error type.
 */
export function mapErrorCode(
  code: number,
  message: string,
  metadata: Record<string, string> = {}
): FilaError {
  switch (code) {
    case ERR_QUEUE_NOT_FOUND:
      return new QueueNotFoundError(message);
    case ERR_MESSAGE_NOT_FOUND:
      return new MessageNotFoundError(message);
    case ERR_QUEUE_ALREADY_EXISTS:
      return new QueueAlreadyExistsError(message);
    case ERR_UNAUTHORIZED:
      return new UnauthorizedError(message);
    case ERR_FORBIDDEN:
      return new ForbiddenError(message);
    case ERR_NOT_LEADER:
      return new NotLeaderError(message, metadata["leader_addr"]);
    case ERR_API_KEY_NOT_FOUND:
      return new ApiKeyNotFoundError(message);
    case ERR_CHANNEL_FULL: {
      const retryAfter = metadata["retry_after_ms"];
      return new ChannelFullError(message, retryAfter ? parseInt(retryAfter, 10) : undefined);
    }
    case ERR_LUA_COMPILATION_ERROR:
    case ERR_STORAGE_ERROR:
    case ERR_NOT_A_DLQ:
    case ERR_PARENT_QUEUE_NOT_FOUND:
    case ERR_INVALID_CONFIG_VALUE:
    case ERR_UNSUPPORTED_VERSION:
    case ERR_INVALID_FRAME:
    case ERR_NODE_NOT_READY:
    case ERR_INTERNAL_ERROR:
      return new ProtocolError(code, message, metadata);
    default:
      return new ProtocolError(code, message, metadata);
  }
}

/**
 * Map a per-item error code (from batch results) into the appropriate SDK error.
 * Per-item results only carry a u8 error code, no message/metadata.
 */
export function mapItemErrorCode(code: number, context: string): FilaError {
  const name = ERROR_CODE_NAMES[code] ?? `0x${code.toString(16)}`;
  return mapErrorCode(code, `${context}: ${name}`);
}

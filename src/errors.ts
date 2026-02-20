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

/** Raised for unexpected gRPC failures, preserving status code and message. */
export class RPCError extends FilaError {
  public readonly code: number;

  constructor(code: number, message: string) {
    super(`rpc error (code = ${code}): ${message}`);
    this.name = "RPCError";
    this.code = code;
  }
}

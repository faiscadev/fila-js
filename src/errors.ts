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

/** Raised when the request is rejected due to missing or invalid credentials. */
export class UnauthenticatedError extends FilaError {
  constructor(message: string) {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

/** Raised for unexpected protocol-level failures, preserving the wire error code. */
export class RPCError extends FilaError {
  public readonly code: number;
  /** The raw error message from the server, without the code prefix. */
  public readonly detail: string;

  constructor(code: number, message: string) {
    super(`rpc error (code = ${code}): ${message}`);
    this.name = "RPCError";
    this.code = code;
    this.detail = message;
  }
}

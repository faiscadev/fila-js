/** FIBP protocol version. */
export const PROTOCOL_VERSION = 1;

/** Frame header size: opcode(1) + flags(1) + request_id(4) = 6 bytes. */
export const FRAME_HEADER_SIZE = 6;

/** Frame length prefix size. */
export const FRAME_LENGTH_PREFIX_SIZE = 4;

/** Default max frame size (16 MiB). */
export const DEFAULT_MAX_FRAME_SIZE = 16 * 1024 * 1024;

/** Flags */
export const FLAG_CONTINUATION = 0x01;

// --- Opcodes ---

// Control
export const OP_HANDSHAKE = 0x01;
export const OP_HANDSHAKE_OK = 0x02;
export const OP_PING = 0x03;
export const OP_PONG = 0x04;
export const OP_DISCONNECT = 0x05;

// Hot-path
export const OP_ENQUEUE = 0x10;
export const OP_ENQUEUE_RESULT = 0x11;
export const OP_CONSUME = 0x12;
export const OP_CONSUME_OK = 0x13;
export const OP_DELIVERY = 0x14;
export const OP_CANCEL_CONSUME = 0x15;
export const OP_ACK = 0x16;
export const OP_ACK_RESULT = 0x17;
export const OP_NACK = 0x18;
export const OP_NACK_RESULT = 0x19;

// Error
export const OP_ERROR = 0xfe;

// Admin
export const OP_CREATE_QUEUE = 0xfd;
export const OP_CREATE_QUEUE_RESULT = 0xfc;
export const OP_DELETE_QUEUE = 0xfb;
export const OP_DELETE_QUEUE_RESULT = 0xfa;
export const OP_GET_STATS = 0xf9;
export const OP_GET_STATS_RESULT = 0xf8;
export const OP_LIST_QUEUES = 0xf7;
export const OP_LIST_QUEUES_RESULT = 0xf6;
export const OP_SET_CONFIG = 0xf5;
export const OP_SET_CONFIG_RESULT = 0xf4;
export const OP_GET_CONFIG = 0xf3;
export const OP_GET_CONFIG_RESULT = 0xf2;
export const OP_LIST_CONFIG = 0xf1;
export const OP_LIST_CONFIG_RESULT = 0xf0;
export const OP_REDRIVE = 0xef;
export const OP_REDRIVE_RESULT = 0xee;
export const OP_CREATE_API_KEY = 0xed;
export const OP_CREATE_API_KEY_RESULT = 0xec;
export const OP_REVOKE_API_KEY = 0xeb;
export const OP_REVOKE_API_KEY_RESULT = 0xea;
export const OP_LIST_API_KEYS = 0xe9;
export const OP_LIST_API_KEYS_RESULT = 0xe8;
export const OP_SET_ACL = 0xe7;
export const OP_SET_ACL_RESULT = 0xe6;
export const OP_GET_ACL = 0xe5;
export const OP_GET_ACL_RESULT = 0xe4;

// --- Error Codes ---

export const ERR_OK = 0x00;
export const ERR_QUEUE_NOT_FOUND = 0x01;
export const ERR_MESSAGE_NOT_FOUND = 0x02;
export const ERR_QUEUE_ALREADY_EXISTS = 0x03;
export const ERR_LUA_COMPILATION_ERROR = 0x04;
export const ERR_STORAGE_ERROR = 0x05;
export const ERR_NOT_A_DLQ = 0x06;
export const ERR_PARENT_QUEUE_NOT_FOUND = 0x07;
export const ERR_INVALID_CONFIG_VALUE = 0x08;
export const ERR_CHANNEL_FULL = 0x09;
export const ERR_UNAUTHORIZED = 0x0a;
export const ERR_FORBIDDEN = 0x0b;
export const ERR_NOT_LEADER = 0x0c;
export const ERR_UNSUPPORTED_VERSION = 0x0d;
export const ERR_INVALID_FRAME = 0x0e;
export const ERR_API_KEY_NOT_FOUND = 0x0f;
export const ERR_NODE_NOT_READY = 0x10;
export const ERR_INTERNAL_ERROR = 0xff;

/** Map error code to human-readable name. */
export const ERROR_CODE_NAMES: Record<number, string> = {
  [ERR_OK]: "Ok",
  [ERR_QUEUE_NOT_FOUND]: "QueueNotFound",
  [ERR_MESSAGE_NOT_FOUND]: "MessageNotFound",
  [ERR_QUEUE_ALREADY_EXISTS]: "QueueAlreadyExists",
  [ERR_LUA_COMPILATION_ERROR]: "LuaCompilationError",
  [ERR_STORAGE_ERROR]: "StorageError",
  [ERR_NOT_A_DLQ]: "NotADLQ",
  [ERR_PARENT_QUEUE_NOT_FOUND]: "ParentQueueNotFound",
  [ERR_INVALID_CONFIG_VALUE]: "InvalidConfigValue",
  [ERR_CHANNEL_FULL]: "ChannelFull",
  [ERR_UNAUTHORIZED]: "Unauthorized",
  [ERR_FORBIDDEN]: "Forbidden",
  [ERR_NOT_LEADER]: "NotLeader",
  [ERR_UNSUPPORTED_VERSION]: "UnsupportedVersion",
  [ERR_INVALID_FRAME]: "InvalidFrame",
  [ERR_API_KEY_NOT_FOUND]: "ApiKeyNotFound",
  [ERR_NODE_NOT_READY]: "NodeNotReady",
  [ERR_INTERNAL_ERROR]: "InternalError",
};

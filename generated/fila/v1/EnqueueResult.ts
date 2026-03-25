// Original file: proto/fila/v1/service.proto

import type { EnqueueError as _fila_v1_EnqueueError, EnqueueError__Output as _fila_v1_EnqueueError__Output } from '../../fila/v1/EnqueueError';

export interface EnqueueResult {
  'messageId'?: (string);
  'error'?: (_fila_v1_EnqueueError | null);
  'result'?: "messageId"|"error";
}

export interface EnqueueResult__Output {
  'messageId'?: (string);
  'error'?: (_fila_v1_EnqueueError__Output | null);
  'result'?: "messageId"|"error";
}

// Original file: proto/fila/v1/service.proto

import type { EnqueueResponse as _fila_v1_EnqueueResponse, EnqueueResponse__Output as _fila_v1_EnqueueResponse__Output } from '../../fila/v1/EnqueueResponse';

export interface BatchEnqueueResult {
  'success'?: (_fila_v1_EnqueueResponse | null);
  'error'?: (string);
  'result'?: "success"|"error";
}

export interface BatchEnqueueResult__Output {
  'success'?: (_fila_v1_EnqueueResponse__Output | null);
  'error'?: (string);
  'result'?: "success"|"error";
}

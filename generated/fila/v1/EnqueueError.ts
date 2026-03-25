// Original file: proto/fila/v1/service.proto

import type { EnqueueErrorCode as _fila_v1_EnqueueErrorCode, EnqueueErrorCode__Output as _fila_v1_EnqueueErrorCode__Output } from '../../fila/v1/EnqueueErrorCode';

export interface EnqueueError {
  'code'?: (_fila_v1_EnqueueErrorCode);
  'message'?: (string);
}

export interface EnqueueError__Output {
  'code': (_fila_v1_EnqueueErrorCode__Output);
  'message': (string);
}

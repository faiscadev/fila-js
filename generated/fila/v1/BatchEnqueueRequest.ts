// Original file: proto/fila/v1/service.proto

import type { EnqueueRequest as _fila_v1_EnqueueRequest, EnqueueRequest__Output as _fila_v1_EnqueueRequest__Output } from '../../fila/v1/EnqueueRequest';

export interface BatchEnqueueRequest {
  'messages'?: (_fila_v1_EnqueueRequest)[];
}

export interface BatchEnqueueRequest__Output {
  'messages': (_fila_v1_EnqueueRequest__Output)[];
}

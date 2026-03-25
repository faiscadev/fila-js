// Original file: proto/fila/v1/service.proto

import type { EnqueueResult as _fila_v1_EnqueueResult, EnqueueResult__Output as _fila_v1_EnqueueResult__Output } from '../../fila/v1/EnqueueResult';
import type { Long } from '@grpc/proto-loader';

export interface StreamEnqueueResponse {
  'sequenceNumber'?: (number | string | Long);
  'results'?: (_fila_v1_EnqueueResult)[];
}

export interface StreamEnqueueResponse__Output {
  'sequenceNumber': (string);
  'results': (_fila_v1_EnqueueResult__Output)[];
}

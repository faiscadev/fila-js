// Original file: proto/fila/v1/service.proto

import type { EnqueueMessage as _fila_v1_EnqueueMessage, EnqueueMessage__Output as _fila_v1_EnqueueMessage__Output } from '../../fila/v1/EnqueueMessage';
import type { Long } from '@grpc/proto-loader';

export interface StreamEnqueueRequest {
  'messages'?: (_fila_v1_EnqueueMessage)[];
  'sequenceNumber'?: (number | string | Long);
}

export interface StreamEnqueueRequest__Output {
  'messages': (_fila_v1_EnqueueMessage__Output)[];
  'sequenceNumber': (string);
}

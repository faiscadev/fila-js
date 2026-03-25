// Original file: proto/fila/v1/service.proto

import type { AckMessage as _fila_v1_AckMessage, AckMessage__Output as _fila_v1_AckMessage__Output } from '../../fila/v1/AckMessage';

export interface AckRequest {
  'messages'?: (_fila_v1_AckMessage)[];
}

export interface AckRequest__Output {
  'messages': (_fila_v1_AckMessage__Output)[];
}

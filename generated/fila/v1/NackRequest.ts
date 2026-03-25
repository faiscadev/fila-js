// Original file: proto/fila/v1/service.proto

import type { NackMessage as _fila_v1_NackMessage, NackMessage__Output as _fila_v1_NackMessage__Output } from '../../fila/v1/NackMessage';

export interface NackRequest {
  'messages'?: (_fila_v1_NackMessage)[];
}

export interface NackRequest__Output {
  'messages': (_fila_v1_NackMessage__Output)[];
}

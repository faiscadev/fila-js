// Original file: proto/fila/v1/service.proto

import type { NackSuccess as _fila_v1_NackSuccess, NackSuccess__Output as _fila_v1_NackSuccess__Output } from '../../fila/v1/NackSuccess';
import type { NackError as _fila_v1_NackError, NackError__Output as _fila_v1_NackError__Output } from '../../fila/v1/NackError';

export interface NackResult {
  'success'?: (_fila_v1_NackSuccess | null);
  'error'?: (_fila_v1_NackError | null);
  'result'?: "success"|"error";
}

export interface NackResult__Output {
  'success'?: (_fila_v1_NackSuccess__Output | null);
  'error'?: (_fila_v1_NackError__Output | null);
  'result'?: "success"|"error";
}

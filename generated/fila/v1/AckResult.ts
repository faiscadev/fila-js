// Original file: proto/fila/v1/service.proto

import type { AckSuccess as _fila_v1_AckSuccess, AckSuccess__Output as _fila_v1_AckSuccess__Output } from '../../fila/v1/AckSuccess';
import type { AckError as _fila_v1_AckError, AckError__Output as _fila_v1_AckError__Output } from '../../fila/v1/AckError';

export interface AckResult {
  'success'?: (_fila_v1_AckSuccess | null);
  'error'?: (_fila_v1_AckError | null);
  'result'?: "success"|"error";
}

export interface AckResult__Output {
  'success'?: (_fila_v1_AckSuccess__Output | null);
  'error'?: (_fila_v1_AckError__Output | null);
  'result'?: "success"|"error";
}

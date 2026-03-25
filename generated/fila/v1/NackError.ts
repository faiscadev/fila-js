// Original file: proto/fila/v1/service.proto

import type { NackErrorCode as _fila_v1_NackErrorCode, NackErrorCode__Output as _fila_v1_NackErrorCode__Output } from '../../fila/v1/NackErrorCode';

export interface NackError {
  'code'?: (_fila_v1_NackErrorCode);
  'message'?: (string);
}

export interface NackError__Output {
  'code': (_fila_v1_NackErrorCode__Output);
  'message': (string);
}

// Original file: proto/fila/v1/service.proto

import type { AckErrorCode as _fila_v1_AckErrorCode, AckErrorCode__Output as _fila_v1_AckErrorCode__Output } from '../../fila/v1/AckErrorCode';

export interface AckError {
  'code'?: (_fila_v1_AckErrorCode);
  'message'?: (string);
}

export interface AckError__Output {
  'code': (_fila_v1_AckErrorCode__Output);
  'message': (string);
}

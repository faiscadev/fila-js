// Original file: proto/fila/v1/admin.proto

import type { ConfigEntry as _fila_v1_ConfigEntry, ConfigEntry__Output as _fila_v1_ConfigEntry__Output } from '../../fila/v1/ConfigEntry';

export interface ListConfigResponse {
  'entries'?: (_fila_v1_ConfigEntry)[];
  'totalCount'?: (number);
}

export interface ListConfigResponse__Output {
  'entries': (_fila_v1_ConfigEntry__Output)[];
  'totalCount': (number);
}

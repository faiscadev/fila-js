// Original file: proto/fila/v1/admin.proto

import type { Long } from '@grpc/proto-loader';

export interface PerFairnessKeyStats {
  'key'?: (string);
  'pendingCount'?: (number | string | Long);
  'currentDeficit'?: (number | string | Long);
  'weight'?: (number);
}

export interface PerFairnessKeyStats__Output {
  'key': (string);
  'pendingCount': (string);
  'currentDeficit': (string);
  'weight': (number);
}

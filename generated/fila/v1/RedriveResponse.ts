// Original file: proto/fila/v1/admin.proto

import type { Long } from '@grpc/proto-loader';

export interface RedriveResponse {
  'redriven'?: (number | string | Long);
}

export interface RedriveResponse__Output {
  'redriven': (string);
}

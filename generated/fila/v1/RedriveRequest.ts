// Original file: proto/fila/v1/admin.proto

import type { Long } from '@grpc/proto-loader';

export interface RedriveRequest {
  'dlqQueue'?: (string);
  'count'?: (number | string | Long);
}

export interface RedriveRequest__Output {
  'dlqQueue': (string);
  'count': (string);
}

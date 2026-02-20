// Original file: proto/fila/v1/admin.proto

import type { Long } from '@grpc/proto-loader';

export interface QueueConfig {
  'onEnqueueScript'?: (string);
  'onFailureScript'?: (string);
  'visibilityTimeoutMs'?: (number | string | Long);
}

export interface QueueConfig__Output {
  'onEnqueueScript': (string);
  'onFailureScript': (string);
  'visibilityTimeoutMs': (string);
}

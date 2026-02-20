// Original file: proto/fila/v1/admin.proto

import type { Long } from '@grpc/proto-loader';

export interface QueueInfo {
  'name'?: (string);
  'depth'?: (number | string | Long);
  'inFlight'?: (number | string | Long);
  'activeConsumers'?: (number);
}

export interface QueueInfo__Output {
  'name': (string);
  'depth': (string);
  'inFlight': (string);
  'activeConsumers': (number);
}

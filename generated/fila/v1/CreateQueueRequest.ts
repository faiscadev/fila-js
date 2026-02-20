// Original file: proto/fila/v1/admin.proto

import type { QueueConfig as _fila_v1_QueueConfig, QueueConfig__Output as _fila_v1_QueueConfig__Output } from '../../fila/v1/QueueConfig';

export interface CreateQueueRequest {
  'name'?: (string);
  'config'?: (_fila_v1_QueueConfig | null);
}

export interface CreateQueueRequest__Output {
  'name': (string);
  'config': (_fila_v1_QueueConfig__Output | null);
}

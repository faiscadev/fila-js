// Original file: proto/fila/v1/admin.proto

import type { PerFairnessKeyStats as _fila_v1_PerFairnessKeyStats, PerFairnessKeyStats__Output as _fila_v1_PerFairnessKeyStats__Output } from '../../fila/v1/PerFairnessKeyStats';
import type { PerThrottleKeyStats as _fila_v1_PerThrottleKeyStats, PerThrottleKeyStats__Output as _fila_v1_PerThrottleKeyStats__Output } from '../../fila/v1/PerThrottleKeyStats';
import type { Long } from '@grpc/proto-loader';

export interface GetStatsResponse {
  'depth'?: (number | string | Long);
  'inFlight'?: (number | string | Long);
  'activeFairnessKeys'?: (number | string | Long);
  'activeConsumers'?: (number);
  'quantum'?: (number);
  'perKeyStats'?: (_fila_v1_PerFairnessKeyStats)[];
  'perThrottleStats'?: (_fila_v1_PerThrottleKeyStats)[];
}

export interface GetStatsResponse__Output {
  'depth': (string);
  'inFlight': (string);
  'activeFairnessKeys': (string);
  'activeConsumers': (number);
  'quantum': (number);
  'perKeyStats': (_fila_v1_PerFairnessKeyStats__Output)[];
  'perThrottleStats': (_fila_v1_PerThrottleKeyStats__Output)[];
}

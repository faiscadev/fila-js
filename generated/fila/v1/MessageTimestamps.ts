// Original file: proto/fila/v1/messages.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../google/protobuf/Timestamp';

export interface MessageTimestamps {
  'enqueuedAt'?: (_google_protobuf_Timestamp | null);
  'leasedAt'?: (_google_protobuf_Timestamp | null);
}

export interface MessageTimestamps__Output {
  'enqueuedAt': (_google_protobuf_Timestamp__Output | null);
  'leasedAt': (_google_protobuf_Timestamp__Output | null);
}

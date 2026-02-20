// Original file: proto/fila/v1/messages.proto

import type { MessageMetadata as _fila_v1_MessageMetadata, MessageMetadata__Output as _fila_v1_MessageMetadata__Output } from '../../fila/v1/MessageMetadata';
import type { MessageTimestamps as _fila_v1_MessageTimestamps, MessageTimestamps__Output as _fila_v1_MessageTimestamps__Output } from '../../fila/v1/MessageTimestamps';

export interface Message {
  'id'?: (string);
  'headers'?: ({[key: string]: string});
  'payload'?: (Buffer | Uint8Array | string);
  'metadata'?: (_fila_v1_MessageMetadata | null);
  'timestamps'?: (_fila_v1_MessageTimestamps | null);
}

export interface Message__Output {
  'id': (string);
  'headers': ({[key: string]: string});
  'payload': (Buffer);
  'metadata': (_fila_v1_MessageMetadata__Output | null);
  'timestamps': (_fila_v1_MessageTimestamps__Output | null);
}

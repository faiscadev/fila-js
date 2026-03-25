// Original file: proto/fila/v1/service.proto


export interface EnqueueMessage {
  'queue'?: (string);
  'headers'?: ({[key: string]: string});
  'payload'?: (Buffer | Uint8Array | string);
}

export interface EnqueueMessage__Output {
  'queue': (string);
  'headers': ({[key: string]: string});
  'payload': (Buffer);
}

// Original file: proto/fila/v1/service.proto


export interface EnqueueRequest {
  'queue'?: (string);
  'headers'?: ({[key: string]: string});
  'payload'?: (Buffer | Uint8Array | string);
}

export interface EnqueueRequest__Output {
  'queue': (string);
  'headers': ({[key: string]: string});
  'payload': (Buffer);
}

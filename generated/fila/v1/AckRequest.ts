// Original file: proto/fila/v1/service.proto


export interface AckRequest {
  'queue'?: (string);
  'messageId'?: (string);
}

export interface AckRequest__Output {
  'queue': (string);
  'messageId': (string);
}

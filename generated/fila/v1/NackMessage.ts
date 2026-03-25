// Original file: proto/fila/v1/service.proto


export interface NackMessage {
  'queue'?: (string);
  'messageId'?: (string);
  'error'?: (string);
}

export interface NackMessage__Output {
  'queue': (string);
  'messageId': (string);
  'error': (string);
}

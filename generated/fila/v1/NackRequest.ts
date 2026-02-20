// Original file: proto/fila/v1/service.proto


export interface NackRequest {
  'queue'?: (string);
  'messageId'?: (string);
  'error'?: (string);
}

export interface NackRequest__Output {
  'queue': (string);
  'messageId': (string);
  'error': (string);
}

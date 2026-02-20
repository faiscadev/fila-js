// Original file: proto/fila/v1/messages.proto


export interface MessageMetadata {
  'fairnessKey'?: (string);
  'weight'?: (number);
  'throttleKeys'?: (string)[];
  'attemptCount'?: (number);
  'queueId'?: (string);
}

export interface MessageMetadata__Output {
  'fairnessKey': (string);
  'weight': (number);
  'throttleKeys': (string)[];
  'attemptCount': (number);
  'queueId': (string);
}

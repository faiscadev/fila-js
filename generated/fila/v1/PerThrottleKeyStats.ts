// Original file: proto/fila/v1/admin.proto


export interface PerThrottleKeyStats {
  'key'?: (string);
  'tokens'?: (number | string);
  'ratePerSecond'?: (number | string);
  'burst'?: (number | string);
}

export interface PerThrottleKeyStats__Output {
  'key': (string);
  'tokens': (number);
  'ratePerSecond': (number);
  'burst': (number);
}

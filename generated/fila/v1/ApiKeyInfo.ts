// Original file: proto/fila/v1/admin.proto

import type { Long } from '@grpc/proto-loader';

export interface ApiKeyInfo {
  'keyId'?: (string);
  'name'?: (string);
  'createdAtMs'?: (number | string | Long);
  'expiresAtMs'?: (number | string | Long);
  'isSuperadmin'?: (boolean);
}

export interface ApiKeyInfo__Output {
  'keyId': (string);
  'name': (string);
  'createdAtMs': (string);
  'expiresAtMs': (string);
  'isSuperadmin': (boolean);
}

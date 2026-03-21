// Original file: proto/fila/v1/admin.proto

import type { Long } from '@grpc/proto-loader';

export interface CreateApiKeyRequest {
  'name'?: (string);
  'expiresAtMs'?: (number | string | Long);
  'isSuperadmin'?: (boolean);
}

export interface CreateApiKeyRequest__Output {
  'name': (string);
  'expiresAtMs': (string);
  'isSuperadmin': (boolean);
}

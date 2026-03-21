// Original file: proto/fila/v1/admin.proto

import type { AclPermission as _fila_v1_AclPermission, AclPermission__Output as _fila_v1_AclPermission__Output } from '../../fila/v1/AclPermission';

export interface GetAclResponse {
  'keyId'?: (string);
  'permissions'?: (_fila_v1_AclPermission)[];
  'isSuperadmin'?: (boolean);
}

export interface GetAclResponse__Output {
  'keyId': (string);
  'permissions': (_fila_v1_AclPermission__Output)[];
  'isSuperadmin': (boolean);
}

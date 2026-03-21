// Original file: proto/fila/v1/admin.proto

import type { AclPermission as _fila_v1_AclPermission, AclPermission__Output as _fila_v1_AclPermission__Output } from '../../fila/v1/AclPermission';

export interface SetAclRequest {
  'keyId'?: (string);
  'permissions'?: (_fila_v1_AclPermission)[];
}

export interface SetAclRequest__Output {
  'keyId': (string);
  'permissions': (_fila_v1_AclPermission__Output)[];
}

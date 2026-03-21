// Original file: proto/fila/v1/admin.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CreateApiKeyRequest as _fila_v1_CreateApiKeyRequest, CreateApiKeyRequest__Output as _fila_v1_CreateApiKeyRequest__Output } from '../../fila/v1/CreateApiKeyRequest';
import type { CreateApiKeyResponse as _fila_v1_CreateApiKeyResponse, CreateApiKeyResponse__Output as _fila_v1_CreateApiKeyResponse__Output } from '../../fila/v1/CreateApiKeyResponse';
import type { CreateQueueRequest as _fila_v1_CreateQueueRequest, CreateQueueRequest__Output as _fila_v1_CreateQueueRequest__Output } from '../../fila/v1/CreateQueueRequest';
import type { CreateQueueResponse as _fila_v1_CreateQueueResponse, CreateQueueResponse__Output as _fila_v1_CreateQueueResponse__Output } from '../../fila/v1/CreateQueueResponse';
import type { DeleteQueueRequest as _fila_v1_DeleteQueueRequest, DeleteQueueRequest__Output as _fila_v1_DeleteQueueRequest__Output } from '../../fila/v1/DeleteQueueRequest';
import type { DeleteQueueResponse as _fila_v1_DeleteQueueResponse, DeleteQueueResponse__Output as _fila_v1_DeleteQueueResponse__Output } from '../../fila/v1/DeleteQueueResponse';
import type { GetAclRequest as _fila_v1_GetAclRequest, GetAclRequest__Output as _fila_v1_GetAclRequest__Output } from '../../fila/v1/GetAclRequest';
import type { GetAclResponse as _fila_v1_GetAclResponse, GetAclResponse__Output as _fila_v1_GetAclResponse__Output } from '../../fila/v1/GetAclResponse';
import type { GetConfigRequest as _fila_v1_GetConfigRequest, GetConfigRequest__Output as _fila_v1_GetConfigRequest__Output } from '../../fila/v1/GetConfigRequest';
import type { GetConfigResponse as _fila_v1_GetConfigResponse, GetConfigResponse__Output as _fila_v1_GetConfigResponse__Output } from '../../fila/v1/GetConfigResponse';
import type { GetStatsRequest as _fila_v1_GetStatsRequest, GetStatsRequest__Output as _fila_v1_GetStatsRequest__Output } from '../../fila/v1/GetStatsRequest';
import type { GetStatsResponse as _fila_v1_GetStatsResponse, GetStatsResponse__Output as _fila_v1_GetStatsResponse__Output } from '../../fila/v1/GetStatsResponse';
import type { ListApiKeysRequest as _fila_v1_ListApiKeysRequest, ListApiKeysRequest__Output as _fila_v1_ListApiKeysRequest__Output } from '../../fila/v1/ListApiKeysRequest';
import type { ListApiKeysResponse as _fila_v1_ListApiKeysResponse, ListApiKeysResponse__Output as _fila_v1_ListApiKeysResponse__Output } from '../../fila/v1/ListApiKeysResponse';
import type { ListConfigRequest as _fila_v1_ListConfigRequest, ListConfigRequest__Output as _fila_v1_ListConfigRequest__Output } from '../../fila/v1/ListConfigRequest';
import type { ListConfigResponse as _fila_v1_ListConfigResponse, ListConfigResponse__Output as _fila_v1_ListConfigResponse__Output } from '../../fila/v1/ListConfigResponse';
import type { ListQueuesRequest as _fila_v1_ListQueuesRequest, ListQueuesRequest__Output as _fila_v1_ListQueuesRequest__Output } from '../../fila/v1/ListQueuesRequest';
import type { ListQueuesResponse as _fila_v1_ListQueuesResponse, ListQueuesResponse__Output as _fila_v1_ListQueuesResponse__Output } from '../../fila/v1/ListQueuesResponse';
import type { RedriveRequest as _fila_v1_RedriveRequest, RedriveRequest__Output as _fila_v1_RedriveRequest__Output } from '../../fila/v1/RedriveRequest';
import type { RedriveResponse as _fila_v1_RedriveResponse, RedriveResponse__Output as _fila_v1_RedriveResponse__Output } from '../../fila/v1/RedriveResponse';
import type { RevokeApiKeyRequest as _fila_v1_RevokeApiKeyRequest, RevokeApiKeyRequest__Output as _fila_v1_RevokeApiKeyRequest__Output } from '../../fila/v1/RevokeApiKeyRequest';
import type { RevokeApiKeyResponse as _fila_v1_RevokeApiKeyResponse, RevokeApiKeyResponse__Output as _fila_v1_RevokeApiKeyResponse__Output } from '../../fila/v1/RevokeApiKeyResponse';
import type { SetAclRequest as _fila_v1_SetAclRequest, SetAclRequest__Output as _fila_v1_SetAclRequest__Output } from '../../fila/v1/SetAclRequest';
import type { SetAclResponse as _fila_v1_SetAclResponse, SetAclResponse__Output as _fila_v1_SetAclResponse__Output } from '../../fila/v1/SetAclResponse';
import type { SetConfigRequest as _fila_v1_SetConfigRequest, SetConfigRequest__Output as _fila_v1_SetConfigRequest__Output } from '../../fila/v1/SetConfigRequest';
import type { SetConfigResponse as _fila_v1_SetConfigResponse, SetConfigResponse__Output as _fila_v1_SetConfigResponse__Output } from '../../fila/v1/SetConfigResponse';

export interface FilaAdminClient extends grpc.Client {
  CreateApiKey(argument: _fila_v1_CreateApiKeyRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_CreateApiKeyResponse__Output>): grpc.ClientUnaryCall;
  CreateApiKey(argument: _fila_v1_CreateApiKeyRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_CreateApiKeyResponse__Output>): grpc.ClientUnaryCall;
  CreateApiKey(argument: _fila_v1_CreateApiKeyRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_CreateApiKeyResponse__Output>): grpc.ClientUnaryCall;
  CreateApiKey(argument: _fila_v1_CreateApiKeyRequest, callback: grpc.requestCallback<_fila_v1_CreateApiKeyResponse__Output>): grpc.ClientUnaryCall;
  createApiKey(argument: _fila_v1_CreateApiKeyRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_CreateApiKeyResponse__Output>): grpc.ClientUnaryCall;
  createApiKey(argument: _fila_v1_CreateApiKeyRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_CreateApiKeyResponse__Output>): grpc.ClientUnaryCall;
  createApiKey(argument: _fila_v1_CreateApiKeyRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_CreateApiKeyResponse__Output>): grpc.ClientUnaryCall;
  createApiKey(argument: _fila_v1_CreateApiKeyRequest, callback: grpc.requestCallback<_fila_v1_CreateApiKeyResponse__Output>): grpc.ClientUnaryCall;
  
  CreateQueue(argument: _fila_v1_CreateQueueRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_CreateQueueResponse__Output>): grpc.ClientUnaryCall;
  CreateQueue(argument: _fila_v1_CreateQueueRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_CreateQueueResponse__Output>): grpc.ClientUnaryCall;
  CreateQueue(argument: _fila_v1_CreateQueueRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_CreateQueueResponse__Output>): grpc.ClientUnaryCall;
  CreateQueue(argument: _fila_v1_CreateQueueRequest, callback: grpc.requestCallback<_fila_v1_CreateQueueResponse__Output>): grpc.ClientUnaryCall;
  createQueue(argument: _fila_v1_CreateQueueRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_CreateQueueResponse__Output>): grpc.ClientUnaryCall;
  createQueue(argument: _fila_v1_CreateQueueRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_CreateQueueResponse__Output>): grpc.ClientUnaryCall;
  createQueue(argument: _fila_v1_CreateQueueRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_CreateQueueResponse__Output>): grpc.ClientUnaryCall;
  createQueue(argument: _fila_v1_CreateQueueRequest, callback: grpc.requestCallback<_fila_v1_CreateQueueResponse__Output>): grpc.ClientUnaryCall;
  
  DeleteQueue(argument: _fila_v1_DeleteQueueRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_DeleteQueueResponse__Output>): grpc.ClientUnaryCall;
  DeleteQueue(argument: _fila_v1_DeleteQueueRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_DeleteQueueResponse__Output>): grpc.ClientUnaryCall;
  DeleteQueue(argument: _fila_v1_DeleteQueueRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_DeleteQueueResponse__Output>): grpc.ClientUnaryCall;
  DeleteQueue(argument: _fila_v1_DeleteQueueRequest, callback: grpc.requestCallback<_fila_v1_DeleteQueueResponse__Output>): grpc.ClientUnaryCall;
  deleteQueue(argument: _fila_v1_DeleteQueueRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_DeleteQueueResponse__Output>): grpc.ClientUnaryCall;
  deleteQueue(argument: _fila_v1_DeleteQueueRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_DeleteQueueResponse__Output>): grpc.ClientUnaryCall;
  deleteQueue(argument: _fila_v1_DeleteQueueRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_DeleteQueueResponse__Output>): grpc.ClientUnaryCall;
  deleteQueue(argument: _fila_v1_DeleteQueueRequest, callback: grpc.requestCallback<_fila_v1_DeleteQueueResponse__Output>): grpc.ClientUnaryCall;
  
  GetAcl(argument: _fila_v1_GetAclRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetAclResponse__Output>): grpc.ClientUnaryCall;
  GetAcl(argument: _fila_v1_GetAclRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_GetAclResponse__Output>): grpc.ClientUnaryCall;
  GetAcl(argument: _fila_v1_GetAclRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetAclResponse__Output>): grpc.ClientUnaryCall;
  GetAcl(argument: _fila_v1_GetAclRequest, callback: grpc.requestCallback<_fila_v1_GetAclResponse__Output>): grpc.ClientUnaryCall;
  getAcl(argument: _fila_v1_GetAclRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetAclResponse__Output>): grpc.ClientUnaryCall;
  getAcl(argument: _fila_v1_GetAclRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_GetAclResponse__Output>): grpc.ClientUnaryCall;
  getAcl(argument: _fila_v1_GetAclRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetAclResponse__Output>): grpc.ClientUnaryCall;
  getAcl(argument: _fila_v1_GetAclRequest, callback: grpc.requestCallback<_fila_v1_GetAclResponse__Output>): grpc.ClientUnaryCall;
  
  GetConfig(argument: _fila_v1_GetConfigRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetConfigResponse__Output>): grpc.ClientUnaryCall;
  GetConfig(argument: _fila_v1_GetConfigRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_GetConfigResponse__Output>): grpc.ClientUnaryCall;
  GetConfig(argument: _fila_v1_GetConfigRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetConfigResponse__Output>): grpc.ClientUnaryCall;
  GetConfig(argument: _fila_v1_GetConfigRequest, callback: grpc.requestCallback<_fila_v1_GetConfigResponse__Output>): grpc.ClientUnaryCall;
  getConfig(argument: _fila_v1_GetConfigRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetConfigResponse__Output>): grpc.ClientUnaryCall;
  getConfig(argument: _fila_v1_GetConfigRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_GetConfigResponse__Output>): grpc.ClientUnaryCall;
  getConfig(argument: _fila_v1_GetConfigRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetConfigResponse__Output>): grpc.ClientUnaryCall;
  getConfig(argument: _fila_v1_GetConfigRequest, callback: grpc.requestCallback<_fila_v1_GetConfigResponse__Output>): grpc.ClientUnaryCall;
  
  GetStats(argument: _fila_v1_GetStatsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetStatsResponse__Output>): grpc.ClientUnaryCall;
  GetStats(argument: _fila_v1_GetStatsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_GetStatsResponse__Output>): grpc.ClientUnaryCall;
  GetStats(argument: _fila_v1_GetStatsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetStatsResponse__Output>): grpc.ClientUnaryCall;
  GetStats(argument: _fila_v1_GetStatsRequest, callback: grpc.requestCallback<_fila_v1_GetStatsResponse__Output>): grpc.ClientUnaryCall;
  getStats(argument: _fila_v1_GetStatsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetStatsResponse__Output>): grpc.ClientUnaryCall;
  getStats(argument: _fila_v1_GetStatsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_GetStatsResponse__Output>): grpc.ClientUnaryCall;
  getStats(argument: _fila_v1_GetStatsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_GetStatsResponse__Output>): grpc.ClientUnaryCall;
  getStats(argument: _fila_v1_GetStatsRequest, callback: grpc.requestCallback<_fila_v1_GetStatsResponse__Output>): grpc.ClientUnaryCall;
  
  ListApiKeys(argument: _fila_v1_ListApiKeysRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListApiKeysResponse__Output>): grpc.ClientUnaryCall;
  ListApiKeys(argument: _fila_v1_ListApiKeysRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_ListApiKeysResponse__Output>): grpc.ClientUnaryCall;
  ListApiKeys(argument: _fila_v1_ListApiKeysRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListApiKeysResponse__Output>): grpc.ClientUnaryCall;
  ListApiKeys(argument: _fila_v1_ListApiKeysRequest, callback: grpc.requestCallback<_fila_v1_ListApiKeysResponse__Output>): grpc.ClientUnaryCall;
  listApiKeys(argument: _fila_v1_ListApiKeysRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListApiKeysResponse__Output>): grpc.ClientUnaryCall;
  listApiKeys(argument: _fila_v1_ListApiKeysRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_ListApiKeysResponse__Output>): grpc.ClientUnaryCall;
  listApiKeys(argument: _fila_v1_ListApiKeysRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListApiKeysResponse__Output>): grpc.ClientUnaryCall;
  listApiKeys(argument: _fila_v1_ListApiKeysRequest, callback: grpc.requestCallback<_fila_v1_ListApiKeysResponse__Output>): grpc.ClientUnaryCall;
  
  ListConfig(argument: _fila_v1_ListConfigRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListConfigResponse__Output>): grpc.ClientUnaryCall;
  ListConfig(argument: _fila_v1_ListConfigRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_ListConfigResponse__Output>): grpc.ClientUnaryCall;
  ListConfig(argument: _fila_v1_ListConfigRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListConfigResponse__Output>): grpc.ClientUnaryCall;
  ListConfig(argument: _fila_v1_ListConfigRequest, callback: grpc.requestCallback<_fila_v1_ListConfigResponse__Output>): grpc.ClientUnaryCall;
  listConfig(argument: _fila_v1_ListConfigRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListConfigResponse__Output>): grpc.ClientUnaryCall;
  listConfig(argument: _fila_v1_ListConfigRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_ListConfigResponse__Output>): grpc.ClientUnaryCall;
  listConfig(argument: _fila_v1_ListConfigRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListConfigResponse__Output>): grpc.ClientUnaryCall;
  listConfig(argument: _fila_v1_ListConfigRequest, callback: grpc.requestCallback<_fila_v1_ListConfigResponse__Output>): grpc.ClientUnaryCall;
  
  ListQueues(argument: _fila_v1_ListQueuesRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListQueuesResponse__Output>): grpc.ClientUnaryCall;
  ListQueues(argument: _fila_v1_ListQueuesRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_ListQueuesResponse__Output>): grpc.ClientUnaryCall;
  ListQueues(argument: _fila_v1_ListQueuesRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListQueuesResponse__Output>): grpc.ClientUnaryCall;
  ListQueues(argument: _fila_v1_ListQueuesRequest, callback: grpc.requestCallback<_fila_v1_ListQueuesResponse__Output>): grpc.ClientUnaryCall;
  listQueues(argument: _fila_v1_ListQueuesRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListQueuesResponse__Output>): grpc.ClientUnaryCall;
  listQueues(argument: _fila_v1_ListQueuesRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_ListQueuesResponse__Output>): grpc.ClientUnaryCall;
  listQueues(argument: _fila_v1_ListQueuesRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_ListQueuesResponse__Output>): grpc.ClientUnaryCall;
  listQueues(argument: _fila_v1_ListQueuesRequest, callback: grpc.requestCallback<_fila_v1_ListQueuesResponse__Output>): grpc.ClientUnaryCall;
  
  Redrive(argument: _fila_v1_RedriveRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_RedriveResponse__Output>): grpc.ClientUnaryCall;
  Redrive(argument: _fila_v1_RedriveRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_RedriveResponse__Output>): grpc.ClientUnaryCall;
  Redrive(argument: _fila_v1_RedriveRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_RedriveResponse__Output>): grpc.ClientUnaryCall;
  Redrive(argument: _fila_v1_RedriveRequest, callback: grpc.requestCallback<_fila_v1_RedriveResponse__Output>): grpc.ClientUnaryCall;
  redrive(argument: _fila_v1_RedriveRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_RedriveResponse__Output>): grpc.ClientUnaryCall;
  redrive(argument: _fila_v1_RedriveRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_RedriveResponse__Output>): grpc.ClientUnaryCall;
  redrive(argument: _fila_v1_RedriveRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_RedriveResponse__Output>): grpc.ClientUnaryCall;
  redrive(argument: _fila_v1_RedriveRequest, callback: grpc.requestCallback<_fila_v1_RedriveResponse__Output>): grpc.ClientUnaryCall;
  
  RevokeApiKey(argument: _fila_v1_RevokeApiKeyRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_RevokeApiKeyResponse__Output>): grpc.ClientUnaryCall;
  RevokeApiKey(argument: _fila_v1_RevokeApiKeyRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_RevokeApiKeyResponse__Output>): grpc.ClientUnaryCall;
  RevokeApiKey(argument: _fila_v1_RevokeApiKeyRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_RevokeApiKeyResponse__Output>): grpc.ClientUnaryCall;
  RevokeApiKey(argument: _fila_v1_RevokeApiKeyRequest, callback: grpc.requestCallback<_fila_v1_RevokeApiKeyResponse__Output>): grpc.ClientUnaryCall;
  revokeApiKey(argument: _fila_v1_RevokeApiKeyRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_RevokeApiKeyResponse__Output>): grpc.ClientUnaryCall;
  revokeApiKey(argument: _fila_v1_RevokeApiKeyRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_RevokeApiKeyResponse__Output>): grpc.ClientUnaryCall;
  revokeApiKey(argument: _fila_v1_RevokeApiKeyRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_RevokeApiKeyResponse__Output>): grpc.ClientUnaryCall;
  revokeApiKey(argument: _fila_v1_RevokeApiKeyRequest, callback: grpc.requestCallback<_fila_v1_RevokeApiKeyResponse__Output>): grpc.ClientUnaryCall;
  
  SetAcl(argument: _fila_v1_SetAclRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_SetAclResponse__Output>): grpc.ClientUnaryCall;
  SetAcl(argument: _fila_v1_SetAclRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_SetAclResponse__Output>): grpc.ClientUnaryCall;
  SetAcl(argument: _fila_v1_SetAclRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_SetAclResponse__Output>): grpc.ClientUnaryCall;
  SetAcl(argument: _fila_v1_SetAclRequest, callback: grpc.requestCallback<_fila_v1_SetAclResponse__Output>): grpc.ClientUnaryCall;
  setAcl(argument: _fila_v1_SetAclRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_SetAclResponse__Output>): grpc.ClientUnaryCall;
  setAcl(argument: _fila_v1_SetAclRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_SetAclResponse__Output>): grpc.ClientUnaryCall;
  setAcl(argument: _fila_v1_SetAclRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_SetAclResponse__Output>): grpc.ClientUnaryCall;
  setAcl(argument: _fila_v1_SetAclRequest, callback: grpc.requestCallback<_fila_v1_SetAclResponse__Output>): grpc.ClientUnaryCall;
  
  SetConfig(argument: _fila_v1_SetConfigRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_SetConfigResponse__Output>): grpc.ClientUnaryCall;
  SetConfig(argument: _fila_v1_SetConfigRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_SetConfigResponse__Output>): grpc.ClientUnaryCall;
  SetConfig(argument: _fila_v1_SetConfigRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_SetConfigResponse__Output>): grpc.ClientUnaryCall;
  SetConfig(argument: _fila_v1_SetConfigRequest, callback: grpc.requestCallback<_fila_v1_SetConfigResponse__Output>): grpc.ClientUnaryCall;
  setConfig(argument: _fila_v1_SetConfigRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_SetConfigResponse__Output>): grpc.ClientUnaryCall;
  setConfig(argument: _fila_v1_SetConfigRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_SetConfigResponse__Output>): grpc.ClientUnaryCall;
  setConfig(argument: _fila_v1_SetConfigRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_SetConfigResponse__Output>): grpc.ClientUnaryCall;
  setConfig(argument: _fila_v1_SetConfigRequest, callback: grpc.requestCallback<_fila_v1_SetConfigResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface FilaAdminHandlers extends grpc.UntypedServiceImplementation {
  CreateApiKey: grpc.handleUnaryCall<_fila_v1_CreateApiKeyRequest__Output, _fila_v1_CreateApiKeyResponse>;
  
  CreateQueue: grpc.handleUnaryCall<_fila_v1_CreateQueueRequest__Output, _fila_v1_CreateQueueResponse>;
  
  DeleteQueue: grpc.handleUnaryCall<_fila_v1_DeleteQueueRequest__Output, _fila_v1_DeleteQueueResponse>;
  
  GetAcl: grpc.handleUnaryCall<_fila_v1_GetAclRequest__Output, _fila_v1_GetAclResponse>;
  
  GetConfig: grpc.handleUnaryCall<_fila_v1_GetConfigRequest__Output, _fila_v1_GetConfigResponse>;
  
  GetStats: grpc.handleUnaryCall<_fila_v1_GetStatsRequest__Output, _fila_v1_GetStatsResponse>;
  
  ListApiKeys: grpc.handleUnaryCall<_fila_v1_ListApiKeysRequest__Output, _fila_v1_ListApiKeysResponse>;
  
  ListConfig: grpc.handleUnaryCall<_fila_v1_ListConfigRequest__Output, _fila_v1_ListConfigResponse>;
  
  ListQueues: grpc.handleUnaryCall<_fila_v1_ListQueuesRequest__Output, _fila_v1_ListQueuesResponse>;
  
  Redrive: grpc.handleUnaryCall<_fila_v1_RedriveRequest__Output, _fila_v1_RedriveResponse>;
  
  RevokeApiKey: grpc.handleUnaryCall<_fila_v1_RevokeApiKeyRequest__Output, _fila_v1_RevokeApiKeyResponse>;
  
  SetAcl: grpc.handleUnaryCall<_fila_v1_SetAclRequest__Output, _fila_v1_SetAclResponse>;
  
  SetConfig: grpc.handleUnaryCall<_fila_v1_SetConfigRequest__Output, _fila_v1_SetConfigResponse>;
  
}

export interface FilaAdminDefinition extends grpc.ServiceDefinition {
  CreateApiKey: MethodDefinition<_fila_v1_CreateApiKeyRequest, _fila_v1_CreateApiKeyResponse, _fila_v1_CreateApiKeyRequest__Output, _fila_v1_CreateApiKeyResponse__Output>
  CreateQueue: MethodDefinition<_fila_v1_CreateQueueRequest, _fila_v1_CreateQueueResponse, _fila_v1_CreateQueueRequest__Output, _fila_v1_CreateQueueResponse__Output>
  DeleteQueue: MethodDefinition<_fila_v1_DeleteQueueRequest, _fila_v1_DeleteQueueResponse, _fila_v1_DeleteQueueRequest__Output, _fila_v1_DeleteQueueResponse__Output>
  GetAcl: MethodDefinition<_fila_v1_GetAclRequest, _fila_v1_GetAclResponse, _fila_v1_GetAclRequest__Output, _fila_v1_GetAclResponse__Output>
  GetConfig: MethodDefinition<_fila_v1_GetConfigRequest, _fila_v1_GetConfigResponse, _fila_v1_GetConfigRequest__Output, _fila_v1_GetConfigResponse__Output>
  GetStats: MethodDefinition<_fila_v1_GetStatsRequest, _fila_v1_GetStatsResponse, _fila_v1_GetStatsRequest__Output, _fila_v1_GetStatsResponse__Output>
  ListApiKeys: MethodDefinition<_fila_v1_ListApiKeysRequest, _fila_v1_ListApiKeysResponse, _fila_v1_ListApiKeysRequest__Output, _fila_v1_ListApiKeysResponse__Output>
  ListConfig: MethodDefinition<_fila_v1_ListConfigRequest, _fila_v1_ListConfigResponse, _fila_v1_ListConfigRequest__Output, _fila_v1_ListConfigResponse__Output>
  ListQueues: MethodDefinition<_fila_v1_ListQueuesRequest, _fila_v1_ListQueuesResponse, _fila_v1_ListQueuesRequest__Output, _fila_v1_ListQueuesResponse__Output>
  Redrive: MethodDefinition<_fila_v1_RedriveRequest, _fila_v1_RedriveResponse, _fila_v1_RedriveRequest__Output, _fila_v1_RedriveResponse__Output>
  RevokeApiKey: MethodDefinition<_fila_v1_RevokeApiKeyRequest, _fila_v1_RevokeApiKeyResponse, _fila_v1_RevokeApiKeyRequest__Output, _fila_v1_RevokeApiKeyResponse__Output>
  SetAcl: MethodDefinition<_fila_v1_SetAclRequest, _fila_v1_SetAclResponse, _fila_v1_SetAclRequest__Output, _fila_v1_SetAclResponse__Output>
  SetConfig: MethodDefinition<_fila_v1_SetConfigRequest, _fila_v1_SetConfigResponse, _fila_v1_SetConfigRequest__Output, _fila_v1_SetConfigResponse__Output>
}

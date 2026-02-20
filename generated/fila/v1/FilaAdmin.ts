// Original file: proto/fila/v1/admin.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CreateQueueRequest as _fila_v1_CreateQueueRequest, CreateQueueRequest__Output as _fila_v1_CreateQueueRequest__Output } from '../../fila/v1/CreateQueueRequest';
import type { CreateQueueResponse as _fila_v1_CreateQueueResponse, CreateQueueResponse__Output as _fila_v1_CreateQueueResponse__Output } from '../../fila/v1/CreateQueueResponse';
import type { DeleteQueueRequest as _fila_v1_DeleteQueueRequest, DeleteQueueRequest__Output as _fila_v1_DeleteQueueRequest__Output } from '../../fila/v1/DeleteQueueRequest';
import type { DeleteQueueResponse as _fila_v1_DeleteQueueResponse, DeleteQueueResponse__Output as _fila_v1_DeleteQueueResponse__Output } from '../../fila/v1/DeleteQueueResponse';
import type { GetConfigRequest as _fila_v1_GetConfigRequest, GetConfigRequest__Output as _fila_v1_GetConfigRequest__Output } from '../../fila/v1/GetConfigRequest';
import type { GetConfigResponse as _fila_v1_GetConfigResponse, GetConfigResponse__Output as _fila_v1_GetConfigResponse__Output } from '../../fila/v1/GetConfigResponse';
import type { GetStatsRequest as _fila_v1_GetStatsRequest, GetStatsRequest__Output as _fila_v1_GetStatsRequest__Output } from '../../fila/v1/GetStatsRequest';
import type { GetStatsResponse as _fila_v1_GetStatsResponse, GetStatsResponse__Output as _fila_v1_GetStatsResponse__Output } from '../../fila/v1/GetStatsResponse';
import type { ListConfigRequest as _fila_v1_ListConfigRequest, ListConfigRequest__Output as _fila_v1_ListConfigRequest__Output } from '../../fila/v1/ListConfigRequest';
import type { ListConfigResponse as _fila_v1_ListConfigResponse, ListConfigResponse__Output as _fila_v1_ListConfigResponse__Output } from '../../fila/v1/ListConfigResponse';
import type { ListQueuesRequest as _fila_v1_ListQueuesRequest, ListQueuesRequest__Output as _fila_v1_ListQueuesRequest__Output } from '../../fila/v1/ListQueuesRequest';
import type { ListQueuesResponse as _fila_v1_ListQueuesResponse, ListQueuesResponse__Output as _fila_v1_ListQueuesResponse__Output } from '../../fila/v1/ListQueuesResponse';
import type { RedriveRequest as _fila_v1_RedriveRequest, RedriveRequest__Output as _fila_v1_RedriveRequest__Output } from '../../fila/v1/RedriveRequest';
import type { RedriveResponse as _fila_v1_RedriveResponse, RedriveResponse__Output as _fila_v1_RedriveResponse__Output } from '../../fila/v1/RedriveResponse';
import type { SetConfigRequest as _fila_v1_SetConfigRequest, SetConfigRequest__Output as _fila_v1_SetConfigRequest__Output } from '../../fila/v1/SetConfigRequest';
import type { SetConfigResponse as _fila_v1_SetConfigResponse, SetConfigResponse__Output as _fila_v1_SetConfigResponse__Output } from '../../fila/v1/SetConfigResponse';

export interface FilaAdminClient extends grpc.Client {
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
  CreateQueue: grpc.handleUnaryCall<_fila_v1_CreateQueueRequest__Output, _fila_v1_CreateQueueResponse>;
  
  DeleteQueue: grpc.handleUnaryCall<_fila_v1_DeleteQueueRequest__Output, _fila_v1_DeleteQueueResponse>;
  
  GetConfig: grpc.handleUnaryCall<_fila_v1_GetConfigRequest__Output, _fila_v1_GetConfigResponse>;
  
  GetStats: grpc.handleUnaryCall<_fila_v1_GetStatsRequest__Output, _fila_v1_GetStatsResponse>;
  
  ListConfig: grpc.handleUnaryCall<_fila_v1_ListConfigRequest__Output, _fila_v1_ListConfigResponse>;
  
  ListQueues: grpc.handleUnaryCall<_fila_v1_ListQueuesRequest__Output, _fila_v1_ListQueuesResponse>;
  
  Redrive: grpc.handleUnaryCall<_fila_v1_RedriveRequest__Output, _fila_v1_RedriveResponse>;
  
  SetConfig: grpc.handleUnaryCall<_fila_v1_SetConfigRequest__Output, _fila_v1_SetConfigResponse>;
  
}

export interface FilaAdminDefinition extends grpc.ServiceDefinition {
  CreateQueue: MethodDefinition<_fila_v1_CreateQueueRequest, _fila_v1_CreateQueueResponse, _fila_v1_CreateQueueRequest__Output, _fila_v1_CreateQueueResponse__Output>
  DeleteQueue: MethodDefinition<_fila_v1_DeleteQueueRequest, _fila_v1_DeleteQueueResponse, _fila_v1_DeleteQueueRequest__Output, _fila_v1_DeleteQueueResponse__Output>
  GetConfig: MethodDefinition<_fila_v1_GetConfigRequest, _fila_v1_GetConfigResponse, _fila_v1_GetConfigRequest__Output, _fila_v1_GetConfigResponse__Output>
  GetStats: MethodDefinition<_fila_v1_GetStatsRequest, _fila_v1_GetStatsResponse, _fila_v1_GetStatsRequest__Output, _fila_v1_GetStatsResponse__Output>
  ListConfig: MethodDefinition<_fila_v1_ListConfigRequest, _fila_v1_ListConfigResponse, _fila_v1_ListConfigRequest__Output, _fila_v1_ListConfigResponse__Output>
  ListQueues: MethodDefinition<_fila_v1_ListQueuesRequest, _fila_v1_ListQueuesResponse, _fila_v1_ListQueuesRequest__Output, _fila_v1_ListQueuesResponse__Output>
  Redrive: MethodDefinition<_fila_v1_RedriveRequest, _fila_v1_RedriveResponse, _fila_v1_RedriveRequest__Output, _fila_v1_RedriveResponse__Output>
  SetConfig: MethodDefinition<_fila_v1_SetConfigRequest, _fila_v1_SetConfigResponse, _fila_v1_SetConfigRequest__Output, _fila_v1_SetConfigResponse__Output>
}

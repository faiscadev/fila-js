import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { FilaAdminClient as _fila_v1_FilaAdminClient, FilaAdminDefinition as _fila_v1_FilaAdminDefinition } from './fila/v1/FilaAdmin';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  fila: {
    v1: {
      ConfigEntry: MessageTypeDefinition
      CreateQueueRequest: MessageTypeDefinition
      CreateQueueResponse: MessageTypeDefinition
      DeleteQueueRequest: MessageTypeDefinition
      DeleteQueueResponse: MessageTypeDefinition
      FilaAdmin: SubtypeConstructor<typeof grpc.Client, _fila_v1_FilaAdminClient> & { service: _fila_v1_FilaAdminDefinition }
      GetConfigRequest: MessageTypeDefinition
      GetConfigResponse: MessageTypeDefinition
      GetStatsRequest: MessageTypeDefinition
      GetStatsResponse: MessageTypeDefinition
      ListConfigRequest: MessageTypeDefinition
      ListConfigResponse: MessageTypeDefinition
      ListQueuesRequest: MessageTypeDefinition
      ListQueuesResponse: MessageTypeDefinition
      PerFairnessKeyStats: MessageTypeDefinition
      PerThrottleKeyStats: MessageTypeDefinition
      QueueConfig: MessageTypeDefinition
      QueueInfo: MessageTypeDefinition
      RedriveRequest: MessageTypeDefinition
      RedriveResponse: MessageTypeDefinition
      SetConfigRequest: MessageTypeDefinition
      SetConfigResponse: MessageTypeDefinition
    }
  }
}


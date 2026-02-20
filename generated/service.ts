import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { FilaServiceClient as _fila_v1_FilaServiceClient, FilaServiceDefinition as _fila_v1_FilaServiceDefinition } from './fila/v1/FilaService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  fila: {
    v1: {
      AckRequest: MessageTypeDefinition
      AckResponse: MessageTypeDefinition
      ConsumeRequest: MessageTypeDefinition
      ConsumeResponse: MessageTypeDefinition
      EnqueueRequest: MessageTypeDefinition
      EnqueueResponse: MessageTypeDefinition
      FilaService: SubtypeConstructor<typeof grpc.Client, _fila_v1_FilaServiceClient> & { service: _fila_v1_FilaServiceDefinition }
      Message: MessageTypeDefinition
      MessageMetadata: MessageTypeDefinition
      MessageTimestamps: MessageTypeDefinition
      NackRequest: MessageTypeDefinition
      NackResponse: MessageTypeDefinition
    }
  }
  google: {
    protobuf: {
      Timestamp: MessageTypeDefinition
    }
  }
}


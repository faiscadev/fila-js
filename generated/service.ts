import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { FilaServiceClient as _fila_v1_FilaServiceClient, FilaServiceDefinition as _fila_v1_FilaServiceDefinition } from './fila/v1/FilaService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  fila: {
    v1: {
      AckError: MessageTypeDefinition
      AckErrorCode: EnumTypeDefinition
      AckMessage: MessageTypeDefinition
      AckRequest: MessageTypeDefinition
      AckResponse: MessageTypeDefinition
      AckResult: MessageTypeDefinition
      AckSuccess: MessageTypeDefinition
      ConsumeRequest: MessageTypeDefinition
      ConsumeResponse: MessageTypeDefinition
      EnqueueError: MessageTypeDefinition
      EnqueueErrorCode: EnumTypeDefinition
      EnqueueMessage: MessageTypeDefinition
      EnqueueRequest: MessageTypeDefinition
      EnqueueResponse: MessageTypeDefinition
      EnqueueResult: MessageTypeDefinition
      FilaService: SubtypeConstructor<typeof grpc.Client, _fila_v1_FilaServiceClient> & { service: _fila_v1_FilaServiceDefinition }
      Message: MessageTypeDefinition
      MessageMetadata: MessageTypeDefinition
      MessageTimestamps: MessageTypeDefinition
      NackError: MessageTypeDefinition
      NackErrorCode: EnumTypeDefinition
      NackMessage: MessageTypeDefinition
      NackRequest: MessageTypeDefinition
      NackResponse: MessageTypeDefinition
      NackResult: MessageTypeDefinition
      NackSuccess: MessageTypeDefinition
      StreamEnqueueRequest: MessageTypeDefinition
      StreamEnqueueResponse: MessageTypeDefinition
    }
  }
  google: {
    protobuf: {
      Timestamp: MessageTypeDefinition
    }
  }
}


// Original file: proto/fila/v1/service.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { AckRequest as _fila_v1_AckRequest, AckRequest__Output as _fila_v1_AckRequest__Output } from '../../fila/v1/AckRequest';
import type { AckResponse as _fila_v1_AckResponse, AckResponse__Output as _fila_v1_AckResponse__Output } from '../../fila/v1/AckResponse';
import type { ConsumeRequest as _fila_v1_ConsumeRequest, ConsumeRequest__Output as _fila_v1_ConsumeRequest__Output } from '../../fila/v1/ConsumeRequest';
import type { ConsumeResponse as _fila_v1_ConsumeResponse, ConsumeResponse__Output as _fila_v1_ConsumeResponse__Output } from '../../fila/v1/ConsumeResponse';
import type { EnqueueRequest as _fila_v1_EnqueueRequest, EnqueueRequest__Output as _fila_v1_EnqueueRequest__Output } from '../../fila/v1/EnqueueRequest';
import type { EnqueueResponse as _fila_v1_EnqueueResponse, EnqueueResponse__Output as _fila_v1_EnqueueResponse__Output } from '../../fila/v1/EnqueueResponse';
import type { NackRequest as _fila_v1_NackRequest, NackRequest__Output as _fila_v1_NackRequest__Output } from '../../fila/v1/NackRequest';
import type { NackResponse as _fila_v1_NackResponse, NackResponse__Output as _fila_v1_NackResponse__Output } from '../../fila/v1/NackResponse';

export interface FilaServiceClient extends grpc.Client {
  Ack(argument: _fila_v1_AckRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_AckResponse__Output>): grpc.ClientUnaryCall;
  Ack(argument: _fila_v1_AckRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_AckResponse__Output>): grpc.ClientUnaryCall;
  Ack(argument: _fila_v1_AckRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_AckResponse__Output>): grpc.ClientUnaryCall;
  Ack(argument: _fila_v1_AckRequest, callback: grpc.requestCallback<_fila_v1_AckResponse__Output>): grpc.ClientUnaryCall;
  ack(argument: _fila_v1_AckRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_AckResponse__Output>): grpc.ClientUnaryCall;
  ack(argument: _fila_v1_AckRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_AckResponse__Output>): grpc.ClientUnaryCall;
  ack(argument: _fila_v1_AckRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_AckResponse__Output>): grpc.ClientUnaryCall;
  ack(argument: _fila_v1_AckRequest, callback: grpc.requestCallback<_fila_v1_AckResponse__Output>): grpc.ClientUnaryCall;
  
  Consume(argument: _fila_v1_ConsumeRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_fila_v1_ConsumeResponse__Output>;
  Consume(argument: _fila_v1_ConsumeRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_fila_v1_ConsumeResponse__Output>;
  consume(argument: _fila_v1_ConsumeRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_fila_v1_ConsumeResponse__Output>;
  consume(argument: _fila_v1_ConsumeRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_fila_v1_ConsumeResponse__Output>;
  
  Enqueue(argument: _fila_v1_EnqueueRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_EnqueueResponse__Output>): grpc.ClientUnaryCall;
  Enqueue(argument: _fila_v1_EnqueueRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_EnqueueResponse__Output>): grpc.ClientUnaryCall;
  Enqueue(argument: _fila_v1_EnqueueRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_EnqueueResponse__Output>): grpc.ClientUnaryCall;
  Enqueue(argument: _fila_v1_EnqueueRequest, callback: grpc.requestCallback<_fila_v1_EnqueueResponse__Output>): grpc.ClientUnaryCall;
  enqueue(argument: _fila_v1_EnqueueRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_EnqueueResponse__Output>): grpc.ClientUnaryCall;
  enqueue(argument: _fila_v1_EnqueueRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_EnqueueResponse__Output>): grpc.ClientUnaryCall;
  enqueue(argument: _fila_v1_EnqueueRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_EnqueueResponse__Output>): grpc.ClientUnaryCall;
  enqueue(argument: _fila_v1_EnqueueRequest, callback: grpc.requestCallback<_fila_v1_EnqueueResponse__Output>): grpc.ClientUnaryCall;
  
  Nack(argument: _fila_v1_NackRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_NackResponse__Output>): grpc.ClientUnaryCall;
  Nack(argument: _fila_v1_NackRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_NackResponse__Output>): grpc.ClientUnaryCall;
  Nack(argument: _fila_v1_NackRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_NackResponse__Output>): grpc.ClientUnaryCall;
  Nack(argument: _fila_v1_NackRequest, callback: grpc.requestCallback<_fila_v1_NackResponse__Output>): grpc.ClientUnaryCall;
  nack(argument: _fila_v1_NackRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_NackResponse__Output>): grpc.ClientUnaryCall;
  nack(argument: _fila_v1_NackRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_fila_v1_NackResponse__Output>): grpc.ClientUnaryCall;
  nack(argument: _fila_v1_NackRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_fila_v1_NackResponse__Output>): grpc.ClientUnaryCall;
  nack(argument: _fila_v1_NackRequest, callback: grpc.requestCallback<_fila_v1_NackResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface FilaServiceHandlers extends grpc.UntypedServiceImplementation {
  Ack: grpc.handleUnaryCall<_fila_v1_AckRequest__Output, _fila_v1_AckResponse>;
  
  Consume: grpc.handleServerStreamingCall<_fila_v1_ConsumeRequest__Output, _fila_v1_ConsumeResponse>;
  
  Enqueue: grpc.handleUnaryCall<_fila_v1_EnqueueRequest__Output, _fila_v1_EnqueueResponse>;
  
  Nack: grpc.handleUnaryCall<_fila_v1_NackRequest__Output, _fila_v1_NackResponse>;
  
}

export interface FilaServiceDefinition extends grpc.ServiceDefinition {
  Ack: MethodDefinition<_fila_v1_AckRequest, _fila_v1_AckResponse, _fila_v1_AckRequest__Output, _fila_v1_AckResponse__Output>
  Consume: MethodDefinition<_fila_v1_ConsumeRequest, _fila_v1_ConsumeResponse, _fila_v1_ConsumeRequest__Output, _fila_v1_ConsumeResponse__Output>
  Enqueue: MethodDefinition<_fila_v1_EnqueueRequest, _fila_v1_EnqueueResponse, _fila_v1_EnqueueRequest__Output, _fila_v1_EnqueueResponse__Output>
  Nack: MethodDefinition<_fila_v1_NackRequest, _fila_v1_NackResponse, _fila_v1_NackRequest__Output, _fila_v1_NackResponse__Output>
}

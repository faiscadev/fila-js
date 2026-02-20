# fila-js

JavaScript/TypeScript client SDK for the [Fila](https://github.com/faisca/fila) message broker.

## Installation

```bash
npm install @fila/client
```

## Usage

```typescript
import { Client } from "@fila/client";

const client = new Client("localhost:5555");

// Enqueue a message.
const msgId = await client.enqueue(
  "my-queue",
  { tenant: "acme" },
  Buffer.from("hello world")
);
console.log("Enqueued:", msgId);

// Consume messages.
for await (const msg of client.consume("my-queue")) {
  console.log(`Received: ${msg.id} (attempt ${msg.attemptCount})`);

  try {
    // Process the message...
    await client.ack("my-queue", msg.id);
  } catch (err) {
    await client.nack("my-queue", msg.id, String(err));
  }
}

client.close();
```

## API

### `new Client(addr: string)`

Connect to a Fila broker at the given address (e.g., `"localhost:5555"`).

### `client.enqueue(queue, headers, payload): Promise<string>`

Enqueue a message. Returns the broker-assigned message ID (UUIDv7).

### `client.consume(queue): AsyncIterable<ConsumeMessage>`

Open a streaming consumer. Returns an async iterable that yields messages as they become available. Nacked messages are redelivered on the same stream.

### `client.ack(queue, msgId): Promise<void>`

Acknowledge a successfully processed message. The message is permanently removed.

### `client.nack(queue, msgId, error): Promise<void>`

Negatively acknowledge a failed message. The message is requeued or routed to the dead-letter queue based on the queue's configuration.

### `client.close(): void`

Close the underlying gRPC channel.

## Error Handling

Per-operation error classes are thrown for specific failure modes:

```typescript
import { QueueNotFoundError, MessageNotFoundError } from "@fila/client";

try {
  await client.enqueue("missing-queue", null, Buffer.from("test"));
} catch (err) {
  if (err instanceof QueueNotFoundError) {
    // handle queue not found
  }
}

try {
  await client.ack("my-queue", "missing-id");
} catch (err) {
  if (err instanceof MessageNotFoundError) {
    // handle message not found
  }
}
```

## License

AGPLv3

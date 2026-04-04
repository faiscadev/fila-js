# fila-js

JavaScript/TypeScript client SDK for the [Fila](https://github.com/faisca/fila) message broker.

Uses the Fila binary protocol (FIBP) over TCP for all communication.

## Installation

```bash
npm install fila-client
```

## Usage

```typescript
import { Client } from "fila-client";

const client = new Client("localhost:5555");
await client.connect();

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

await client.close();
```

### TLS (system trust store)

If the Fila server uses a certificate signed by a public CA, enable TLS without providing a CA certificate -- the OS system trust store is used automatically:

```typescript
const client = new Client("localhost:5555", { tls: true });
await client.connect();
```

### TLS (custom CA certificate)

For self-signed or private CA certificates, pass the CA cert explicitly:

```typescript
import * as fs from "fs";
import { Client } from "fila-client";

const client = new Client("localhost:5555", {
  caCert: fs.readFileSync("ca.pem"),
});
await client.connect();
```

### Mutual TLS (mTLS)

Client certificates work with both modes -- system trust store or custom CA:

```typescript
import * as fs from "fs";
import { Client } from "fila-client";

const client = new Client("localhost:5555", {
  caCert: fs.readFileSync("ca.pem"),
  clientCert: fs.readFileSync("client.pem"),
  clientKey: fs.readFileSync("client.key"),
});
await client.connect();
```

### API key authentication

```typescript
const client = new Client("localhost:5555", {
  apiKey: "my-api-key",
});
await client.connect();
```

### mTLS + API key

```typescript
import * as fs from "fs";
import { Client } from "fila-client";

const client = new Client("localhost:5555", {
  caCert: fs.readFileSync("ca.pem"),
  clientCert: fs.readFileSync("client.pem"),
  clientKey: fs.readFileSync("client.key"),
  apiKey: "my-api-key",
});
await client.connect();
```

## API

### `new Client(addr: string, options?: ClientOptions)`

Create a client for the given address (e.g., `"localhost:5555"`). Call `connect()` to establish the connection.

**Options:**

| Option       | Type      | Description                                                        |
|-------------|-----------|---------------------------------------------------------------------|
| `tls`       | `boolean` | Enable TLS using the OS system trust store. Implied when `caCert` is set. |
| `caCert`    | `Buffer`  | CA certificate PEM. Enables TLS with a custom CA when set.         |
| `clientCert`| `Buffer`  | Client certificate PEM for mTLS. Requires TLS to be enabled.      |
| `clientKey` | `Buffer`  | Client private key PEM for mTLS. Requires TLS to be enabled.      |
| `apiKey`    | `string`  | API key sent in the FIBP handshake.                                |
| `batchMode` | `string`  | Enqueue batching: `'auto'` (default), `'linger'`, or `'disabled'`. |

### `client.connect(): Promise<void>`

Establish the TCP connection (with optional TLS) and perform the FIBP handshake.

### `client.enqueue(queue, headers, payload): Promise<string>`

Enqueue a message. Returns the broker-assigned message ID (UUIDv7).

### `client.enqueueMany(messages): Promise<EnqueueResult[]>`

Enqueue multiple messages in a single batch request. Returns per-message results.

### `client.consume(queue): AsyncIterable<ConsumeMessage>`

Open a streaming consumer. Returns an async iterable that yields messages as they become available.

### `client.ack(queue, msgId): Promise<void>`

Acknowledge a successfully processed message.

### `client.nack(queue, msgId, error): Promise<void>`

Negatively acknowledge a failed message.

### `client.close(): Promise<void>`

Close the client, draining any pending batched messages first.

### Admin operations

- `client.createQueue(name, opts?): Promise<string>` -- Create a queue.
- `client.deleteQueue(queue): Promise<void>` -- Delete a queue.
- `client.getStats(queue): Promise<QueueStats>` -- Get queue statistics.
- `client.listQueues(): Promise<{ clusterNodeCount, queues }>` -- List all queues.
- `client.setConfig(key, value): Promise<void>` -- Set a runtime config key.
- `client.getConfig(key): Promise<string>` -- Get a runtime config value.
- `client.listConfig(prefix): Promise<Array<{ key, value }>>` -- List config entries.
- `client.redrive(dlqQueue, count): Promise<bigint>` -- Redrive DLQ messages.

### Auth operations

- `client.createApiKey(name, opts?): Promise<{ keyId, key, isSuperadmin }>` -- Create an API key.
- `client.revokeApiKey(keyId): Promise<void>` -- Revoke an API key.
- `client.listApiKeys(): Promise<ApiKeyInfo[]>` -- List all API keys.
- `client.setAcl(keyId, permissions): Promise<void>` -- Set ACL permissions.
- `client.getAcl(keyId): Promise<{ keyId, isSuperadmin, permissions }>` -- Get ACL permissions.

## Error Handling

Per-operation error classes are thrown for specific failure modes:

```typescript
import {
  QueueNotFoundError,
  MessageNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  NotLeaderError,
  QueueAlreadyExistsError,
  ProtocolError,
} from "fila-client";

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

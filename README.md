# fila-js

JavaScript/TypeScript client SDK for the [Fila](https://github.com/faisca/fila) message broker.

Uses the **FIBP** (Fila Binary Protocol) transport — a length-prefixed binary framing protocol over raw TCP, replacing the previous gRPC transport. No protobuf runtime required on the hot path.

## Installation

```bash
npm install fila-client
```

## Usage

```typescript
import { Client } from "fila-client";

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

await client.close();
```

### TLS (system trust store)

If the Fila server uses a certificate signed by a public CA, enable TLS without providing a CA certificate — the OS system trust store is used automatically:

```typescript
import { Client } from "fila-client";

const client = new Client("localhost:5555", { tls: true });
```

### TLS (custom CA certificate)

For self-signed or private CA certificates, pass the CA cert explicitly:

```typescript
import * as fs from "fs";
import { Client } from "fila-client";

const client = new Client("localhost:5555", {
  caCert: fs.readFileSync("ca.pem"),
});
```

### Mutual TLS (mTLS)

Client certificates work with both modes — system trust store or custom CA:

```typescript
import * as fs from "fs";
import { Client } from "fila-client";

// With custom CA:
const client = new Client("localhost:5555", {
  caCert: fs.readFileSync("ca.pem"),
  clientCert: fs.readFileSync("client.pem"),
  clientKey: fs.readFileSync("client.key"),
});

// With system trust store:
const client2 = new Client("localhost:5555", {
  tls: true,
  clientCert: fs.readFileSync("client.pem"),
  clientKey: fs.readFileSync("client.key"),
});
```

### API key authentication

```typescript
import { Client } from "fila-client";

const client = new Client("localhost:5555", {
  apiKey: "my-api-key",
});
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
```

## API

### `new Client(addr: string, options?: ClientOptions)`

Connect to a Fila broker at the given address (e.g., `"localhost:5555"`). The TCP connection and FIBP handshake are established lazily on the first operation.

**Options:**

| Option         | Type      | Description                                                                       |
|----------------|-----------|-----------------------------------------------------------------------------------|
| `tls`          | `boolean` | Enable TLS using the OS system trust store. Implied when `caCert` is set.         |
| `caCert`       | `Buffer`  | CA certificate PEM. Enables TLS with a custom CA when set.                        |
| `clientCert`   | `Buffer`  | Client certificate PEM for mTLS. Requires TLS to be enabled.                     |
| `clientKey`    | `Buffer`  | Client private key PEM for mTLS. Requires TLS to be enabled.                     |
| `apiKey`       | `string`  | API key sent as an AUTH frame immediately after the FIBP handshake.               |
| `batchMode`    | `string`  | `'auto'` (default), `'linger'`, or `'disabled'`. Controls enqueue batching.      |
| `maxBatchSize` | `number`  | Maximum batch size for auto mode. Default: 100.                                   |
| `lingerMs`     | `number`  | Linger timeout in ms for linger mode. Required when `batchMode` is `'linger'`.   |
| `batchSize`    | `number`  | Maximum batch size for linger mode. Required when `batchMode` is `'linger'`.     |

### `client.enqueue(queue, headers, payload): Promise<string>`

Enqueue a message. Returns the broker-assigned message ID (UUIDv7). When batching is enabled (default `'auto'`), messages are opportunistically grouped for throughput.

### `client.enqueueMany(messages): Promise<EnqueueResult[]>`

Enqueue multiple messages in a single request, bypassing the batcher. Returns one result per input message in the same order.

### `client.consume(queue): AsyncIterable<ConsumeMessage>`

Open a streaming consumer. Returns an async iterable that yields messages as they become available. Nacked messages are redelivered on the same stream.

### `client.ack(queue, msgId): Promise<void>`

Acknowledge a successfully processed message. The message is permanently removed.

### `client.nack(queue, msgId, error): Promise<void>`

Negatively acknowledge a failed message. The message is requeued or routed to the dead-letter queue based on the queue's configuration.

### `client.close(): Promise<void>`

Drain any pending batched messages and close the TCP connection.

## Error Handling

Per-operation error classes are thrown for specific failure modes:

```typescript
import {
  QueueNotFoundError,
  MessageNotFoundError,
  UnauthenticatedError,
  RPCError,
} from "fila-client";

try {
  await client.enqueue("missing-queue", null, Buffer.from("test"));
} catch (err) {
  if (err instanceof QueueNotFoundError) {
    // queue does not exist
  } else if (err instanceof UnauthenticatedError) {
    // invalid or missing API key
  } else if (err instanceof RPCError) {
    console.error("wire error code:", err.code);
  }
}

try {
  await client.ack("my-queue", "missing-id");
} catch (err) {
  if (err instanceof MessageNotFoundError) {
    // message already acknowledged or expired
  }
}
```

## Protocol

Fila uses **FIBP** (Fila Binary Protocol) — a lightweight binary framing protocol over raw TCP (or TLS):

- **Frame format**: `[4-byte big-endian length][flags:u8 | op:u8 | corr_id:u32 | payload]`
- **Handshake**: client sends `FIBP\x01\x00`; server echoes the same 6 bytes
- **Hot-path ops** (enqueue, consume, ack, nack): custom binary encoding, no protobuf overhead
- **Admin ops**: protobuf-encoded payloads for schema flexibility
- **Authentication**: API key sent in an AUTH frame immediately after the handshake
- **Multiplexing**: correlation IDs map responses to outstanding requests on the same connection

## License

AGPLv3

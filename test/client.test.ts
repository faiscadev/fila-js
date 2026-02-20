import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "../src";
import { QueueNotFoundError } from "../src/errors";
import {
  startTestServer,
  FILA_SERVER_AVAILABLE,
  type TestServer,
} from "./helpers";

describe.skipIf(!FILA_SERVER_AVAILABLE)("Client", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(() => {
    server?.stop();
  });

  it("enqueue, consume, and ack a message", async () => {
    await server.createQueue("test-enqueue-ack");

    const client = new Client(server.addr);
    try {
      const msgId = await client.enqueue(
        "test-enqueue-ack",
        { key: "value" },
        Buffer.from("hello")
      );
      expect(msgId).toBeTruthy();

      // Consume one message then break.
      let received = false;
      for await (const msg of client.consume("test-enqueue-ack")) {
        expect(msg.id).toBe(msgId);
        expect(msg.headers).toEqual({ key: "value" });
        expect(msg.payload.toString()).toBe("hello");
        expect(msg.queue).toBe("test-enqueue-ack");
        expect(msg.attemptCount).toBe(0);

        await client.ack("test-enqueue-ack", msg.id);
        received = true;
        break;
      }
      expect(received).toBe(true);
    } finally {
      client.close();
    }
  });

  it("nack redelivers the message on the same stream", async () => {
    await server.createQueue("test-nack-redeliver");

    const client = new Client(server.addr);
    try {
      await client.enqueue(
        "test-nack-redeliver",
        null,
        Buffer.from("retry-me")
      );

      // Keep the same stream open — redelivery arrives on the same stream.
      let deliveryCount = 0;
      for await (const msg of client.consume("test-nack-redeliver")) {
        if (deliveryCount === 0) {
          expect(msg.payload.toString()).toBe("retry-me");
          expect(msg.attemptCount).toBe(0);
          await client.nack("test-nack-redeliver", msg.id, "transient error");
          deliveryCount++;
        } else {
          expect(msg.payload.toString()).toBe("retry-me");
          expect(msg.attemptCount).toBe(1);
          await client.ack("test-nack-redeliver", msg.id);
          break;
        }
      }
      expect(deliveryCount).toBe(1);
    } finally {
      client.close();
    }
  });

  it("enqueue to nonexistent queue throws QueueNotFoundError", async () => {
    const client = new Client(server.addr);
    try {
      await expect(
        client.enqueue("no-such-queue", null, Buffer.from("fail"))
      ).rejects.toThrow(QueueNotFoundError);
    } finally {
      client.close();
    }
  });
});

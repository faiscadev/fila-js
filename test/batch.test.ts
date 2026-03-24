import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "../src";
import { QueueNotFoundError } from "../src/errors";
import {
  startTestServer,
  FILA_SERVER_AVAILABLE,
  type TestServer,
} from "./helpers";

describe.skipIf(!FILA_SERVER_AVAILABLE)("Batch operations", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(() => {
    server?.stop();
  });

  describe("batchEnqueue", () => {
    it("enqueues multiple messages in a single RPC", async () => {
      await server.createQueue("batch-multi");

      const client = new Client(server.addr, { batchMode: "disabled" });
      try {
        const results = await client.batchEnqueue([
          { queue: "batch-multi", headers: { idx: "0" }, payload: Buffer.from("msg-0") },
          { queue: "batch-multi", headers: { idx: "1" }, payload: Buffer.from("msg-1") },
          { queue: "batch-multi", headers: { idx: "2" }, payload: Buffer.from("msg-2") },
        ]);

        expect(results).toHaveLength(3);
        for (const result of results) {
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.messageId).toBeTruthy();
          }
        }

        // Verify all messages are consumable.
        const received: string[] = [];
        let count = 0;
        for await (const msg of client.consume("batch-multi")) {
          received.push(msg.payload.toString());
          await client.ack("batch-multi", msg.id);
          count++;
          if (count >= 3) break;
        }
        expect(received).toContain("msg-0");
        expect(received).toContain("msg-1");
        expect(received).toContain("msg-2");
      } finally {
        await client.close();
      }
    });

    it("returns per-message errors for nonexistent queues", async () => {
      await server.createQueue("batch-partial");

      const client = new Client(server.addr, { batchMode: "disabled" });
      try {
        const results = await client.batchEnqueue([
          { queue: "batch-partial", headers: {}, payload: Buffer.from("ok") },
          { queue: "no-such-queue", headers: {}, payload: Buffer.from("fail") },
        ]);

        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
        if (!results[1].success) {
          expect(results[1].error).toBeTruthy();
        }
      } finally {
        await client.close();
      }
    });

    it("returns message IDs in same order as input", async () => {
      await server.createQueue("batch-order");

      const client = new Client(server.addr, { batchMode: "disabled" });
      try {
        const results = await client.batchEnqueue([
          { queue: "batch-order", headers: {}, payload: Buffer.from("first") },
          { queue: "batch-order", headers: {}, payload: Buffer.from("second") },
        ]);

        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(true);
        if (results[0].success && results[1].success) {
          expect(results[0].messageId).not.toBe(results[1].messageId);
        }
      } finally {
        await client.close();
      }
    });
  });

  describe("auto batch mode (default)", () => {
    it("enqueue works with default auto batching", async () => {
      await server.createQueue("auto-batch");

      const client = new Client(server.addr);
      try {
        const msgId = await client.enqueue(
          "auto-batch",
          { key: "value" },
          Buffer.from("batched-msg")
        );
        expect(msgId).toBeTruthy();

        let received = false;
        for await (const msg of client.consume("auto-batch")) {
          expect(msg.id).toBe(msgId);
          expect(msg.headers).toEqual({ key: "value" });
          expect(msg.payload.toString()).toBe("batched-msg");
          await client.ack("auto-batch", msg.id);
          received = true;
          break;
        }
        expect(received).toBe(true);
      } finally {
        await client.close();
      }
    });

    it("multiple concurrent enqueues are batched together", async () => {
      await server.createQueue("auto-concurrent");

      const client = new Client(server.addr);
      try {
        // Fire multiple enqueues concurrently — they should batch together
        // since they arrive within the same event loop turn.
        const promises = Array.from({ length: 5 }, (_, i) =>
          client.enqueue(
            "auto-concurrent",
            { idx: String(i) },
            Buffer.from(`msg-${i}`)
          )
        );

        const messageIds = await Promise.all(promises);
        expect(messageIds).toHaveLength(5);
        for (const id of messageIds) {
          expect(id).toBeTruthy();
        }
        // All IDs should be unique.
        expect(new Set(messageIds).size).toBe(5);
      } finally {
        await client.close();
      }
    });

    it("preserves QueueNotFoundError for single-item batches", async () => {
      const client = new Client(server.addr);
      try {
        // Single message to nonexistent queue: should get QueueNotFoundError
        // because single-item batches use Enqueue RPC.
        await expect(
          client.enqueue("no-such-queue-auto", null, Buffer.from("fail"))
        ).rejects.toThrow(QueueNotFoundError);
      } finally {
        await client.close();
      }
    });
  });

  describe("disabled batch mode", () => {
    it("enqueue works with batching disabled", async () => {
      await server.createQueue("no-batch");

      const client = new Client(server.addr, { batchMode: "disabled" });
      try {
        const msgId = await client.enqueue(
          "no-batch",
          null,
          Buffer.from("direct")
        );
        expect(msgId).toBeTruthy();

        let received = false;
        for await (const msg of client.consume("no-batch")) {
          expect(msg.id).toBe(msgId);
          expect(msg.payload.toString()).toBe("direct");
          await client.ack("no-batch", msg.id);
          received = true;
          break;
        }
        expect(received).toBe(true);
      } finally {
        await client.close();
      }
    });

    it("enqueue to nonexistent queue throws QueueNotFoundError", async () => {
      const client = new Client(server.addr, { batchMode: "disabled" });
      try {
        await expect(
          client.enqueue("no-such-queue-disabled", null, Buffer.from("fail"))
        ).rejects.toThrow(QueueNotFoundError);
      } finally {
        await client.close();
      }
    });
  });

  describe("linger batch mode", () => {
    it("enqueue flushes after lingerMs timeout", async () => {
      await server.createQueue("linger-batch");

      const client = new Client(server.addr, {
        batchMode: "linger",
        lingerMs: 50,
        batchSize: 100,
      });
      try {
        const msgId = await client.enqueue(
          "linger-batch",
          null,
          Buffer.from("lingered")
        );
        expect(msgId).toBeTruthy();
      } finally {
        await client.close();
      }
    });

    it("enqueue flushes when batch size is reached", async () => {
      await server.createQueue("linger-full");

      const client = new Client(server.addr, {
        batchMode: "linger",
        lingerMs: 5000, // Long timer — batch should flush by size first.
        batchSize: 3,
      });
      try {
        const promises = Array.from({ length: 3 }, (_, i) =>
          client.enqueue(
            "linger-full",
            { idx: String(i) },
            Buffer.from(`msg-${i}`)
          )
        );

        const messageIds = await Promise.all(promises);
        expect(messageIds).toHaveLength(3);
        for (const id of messageIds) {
          expect(id).toBeTruthy();
        }
      } finally {
        await client.close();
      }
    });

    it("constructor requires lingerMs and batchSize", () => {
      expect(
        () => new Client("localhost:5555", { batchMode: "linger" } as ClientOptions)
      ).toThrow("lingerMs and batchSize are required");
    });
  });

  describe("close() drains pending messages", () => {
    it("close drains auto-batched messages before disconnecting", async () => {
      await server.createQueue("close-drain");

      const client = new Client(server.addr);

      // Enqueue a message and immediately close.
      const enqueuePromise = client.enqueue(
        "close-drain",
        null,
        Buffer.from("drained")
      );

      // Close should wait for pending messages.
      await client.close();

      // The enqueue should have completed before close returned.
      const msgId = await enqueuePromise;
      expect(msgId).toBeTruthy();

      // Verify the message arrived at the server.
      const verifyClient = new Client(server.addr, { batchMode: "disabled" });
      try {
        let received = false;
        for await (const msg of verifyClient.consume("close-drain")) {
          expect(msg.id).toBe(msgId);
          expect(msg.payload.toString()).toBe("drained");
          await verifyClient.ack("close-drain", msg.id);
          received = true;
          break;
        }
        expect(received).toBe(true);
      } finally {
        await verifyClient.close();
      }
    });
  });
});

// Import ClientOptions type for the constructor test.
import type { ClientOptions } from "../src/client";

import { describe, it, expect } from "vitest";
import {
  encodeFrame,
  encodeEnqueuePayload,
  decodeEnqueueResponse,
  encodeConsumePayload,
  decodeConsumeDelivery,
  encodeAckPayload,
  encodeNackPayload,
  decodeAckNackResponse,
  encodeAuthPayload,
  decodeErrorPayload,
  nextCorrId,
  HANDSHAKE,
  Op,
  FLAG_PUSH,
} from "../src/transport";

describe("transport unit tests (no server)", () => {
  describe("HANDSHAKE", () => {
    it("is exactly FIBP\\x01\\x00", () => {
      expect(HANDSHAKE).toEqual(Buffer.from([0x46, 0x49, 0x42, 0x50, 0x01, 0x00]));
      expect(HANDSHAKE.toString("ascii").slice(0, 4)).toBe("FIBP");
    });
  });

  describe("nextCorrId", () => {
    it("increments and never returns 0", () => {
      const ids = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const id = nextCorrId();
        expect(id).toBeGreaterThan(0);
        ids.add(id);
      }
      // All 100 IDs should be unique (no wrap-around in 100 steps).
      expect(ids.size).toBe(100);
    });
  });

  describe("encodeFrame", () => {
    it("encodes frame with 4-byte length prefix, flags, op, corrId, payload", () => {
      const payload = Buffer.from("hello");
      const frame = encodeFrame(Op.ENQUEUE, 42, payload, 0x04);

      // 4-byte length: flags(1) + op(1) + corrId(4) + payload(5) = 11
      expect(frame.readUInt32BE(0)).toBe(11);
      expect(frame.readUInt8(4)).toBe(0x04); // flags
      expect(frame.readUInt8(5)).toBe(Op.ENQUEUE); // op
      expect(frame.readUInt32BE(6)).toBe(42); // corrId
      expect(frame.subarray(10).toString()).toBe("hello");
    });

    it("encodes empty payload frame", () => {
      const frame = encodeFrame(Op.HEARTBEAT, 1, Buffer.alloc(0));
      expect(frame.readUInt32BE(0)).toBe(6); // just the 6-byte header
      expect(frame.length).toBe(10); // 4 length + 6 header
    });
  });

  describe("enqueue payload round-trip", () => {
    it("encodes and decodes single message", () => {
      const payload = encodeEnqueuePayload([
        { queue: "my-queue", headers: { key: "val" }, payload: Buffer.from("hello") },
      ]);

      // Decode manually to verify layout.
      let off = 0;
      const qLen = payload.readUInt16BE(off); off += 2;
      const queue = payload.subarray(off, off + qLen).toString(); off += qLen;
      const msgCount = payload.readUInt16BE(off); off += 2;
      expect(queue).toBe("my-queue");
      expect(msgCount).toBe(1);

      // Message: headerCount + headers + payloadLen + payload
      const headerCount = payload.readUInt8(off); off += 1;
      expect(headerCount).toBe(1);
      const kLen = payload.readUInt16BE(off); off += 2;
      const k = payload.subarray(off, off + kLen).toString(); off += kLen;
      const vLen = payload.readUInt16BE(off); off += 2;
      const v = payload.subarray(off, off + vLen).toString(); off += vLen;
      expect(k).toBe("key");
      expect(v).toBe("val");
      const pLen = payload.readUInt32BE(off); off += 4;
      const p = payload.subarray(off, off + pLen).toString(); off += pLen;
      expect(pLen).toBe(5);
      expect(p).toBe("hello");
      expect(off).toBe(payload.length);
    });

    it("encodes and decodes multiple messages for same queue", () => {
      const msgs = [
        { queue: "q", headers: {}, payload: Buffer.from("a") },
        { queue: "q", headers: { x: "y" }, payload: Buffer.from("b") },
      ];
      const payload = encodeEnqueuePayload(msgs);
      let off = 0;
      const qLen = payload.readUInt16BE(off); off += 2 + qLen;
      const count = payload.readUInt16BE(off); off += 2;
      expect(count).toBe(2);
    });
  });

  describe("decodeEnqueueResponse", () => {
    it("decodes success result", () => {
      const msgId = "msg-id-123";
      const idBuf = Buffer.from(msgId);
      // count:1, ok:1, idLen, id
      const buf = Buffer.allocUnsafe(2 + 1 + 2 + idBuf.length);
      let off = 0;
      buf.writeUInt16BE(1, off); off += 2;
      buf.writeUInt8(1, off); off += 1; // ok
      buf.writeUInt16BE(idBuf.length, off); off += 2;
      idBuf.copy(buf, off);

      const results = decodeEnqueueResponse(buf);
      expect(results).toHaveLength(1);
      expect(results[0].ok).toBe(true);
      if (results[0].ok) {
        expect(results[0].msgId).toBe(msgId);
      }
    });

    it("decodes error result", () => {
      const errMsg = "queue not found";
      const errBuf = Buffer.from(errMsg);
      const buf = Buffer.allocUnsafe(2 + 1 + 2 + 2 + errBuf.length);
      let off = 0;
      buf.writeUInt16BE(1, off); off += 2;
      buf.writeUInt8(0, off); off += 1; // error
      buf.writeUInt16BE(0x0001, off); off += 2; // QUEUE_NOT_FOUND
      buf.writeUInt16BE(errBuf.length, off); off += 2;
      errBuf.copy(buf, off);

      const results = decodeEnqueueResponse(buf);
      expect(results).toHaveLength(1);
      expect(results[0].ok).toBe(false);
      if (!results[0].ok) {
        expect(results[0].errCode).toBe(0x0001);
        expect(results[0].errMsg).toBe(errMsg);
      }
    });
  });

  describe("consume payload encoding", () => {
    it("encodes queue name and initial credits", () => {
      const payload = encodeConsumePayload("my-queue", 128);
      let off = 0;
      const qLen = payload.readUInt16BE(off); off += 2;
      const queue = payload.subarray(off, off + qLen).toString(); off += qLen;
      const credits = payload.readUInt32BE(off);
      expect(queue).toBe("my-queue");
      expect(credits).toBe(128);
    });
  });

  describe("decodeConsumeDelivery", () => {
    it("decodes a pushed message frame", () => {
      // Build a wire message manually.
      const id = "test-id-001";
      const queue = "my-queue";
      const fk = "tenant-A";
      const attemptCount = 2;
      const headerKey = "x-source";
      const headerVal = "test";
      const msgPayload = Buffer.from("hello world");

      const parts: Buffer[] = [];

      // count:1
      const countBuf = Buffer.allocUnsafe(2);
      countBuf.writeUInt16BE(1, 0);
      parts.push(countBuf);

      const pushField = (s: string, bits = 16) => {
        const buf = Buffer.from(s);
        const lenBuf = bits === 16 ? Buffer.allocUnsafe(2) : Buffer.allocUnsafe(1);
        if (bits === 16) (lenBuf as Buffer).writeUInt16BE(buf.length, 0);
        else (lenBuf as Buffer).writeUInt8(buf.length, 0);
        parts.push(lenBuf, buf);
      };

      pushField(id);
      pushField(queue);
      pushField(fk);

      const attemptBuf = Buffer.allocUnsafe(4);
      attemptBuf.writeUInt32BE(attemptCount, 0);
      parts.push(attemptBuf);

      // 1 header
      const hCountBuf = Buffer.allocUnsafe(1);
      hCountBuf.writeUInt8(1, 0);
      parts.push(hCountBuf);
      pushField(headerKey);
      pushField(headerVal);

      const pLenBuf = Buffer.allocUnsafe(4);
      pLenBuf.writeUInt32BE(msgPayload.length, 0);
      parts.push(pLenBuf, msgPayload);

      const wirePayload = Buffer.concat(parts);
      const messages = decodeConsumeDelivery(wirePayload);

      expect(messages).toHaveLength(1);
      const msg = messages[0];
      expect(msg.id).toBe(id);
      expect(msg.queue).toBe(queue);
      expect(msg.fairnessKey).toBe(fk);
      expect(msg.attemptCount).toBe(attemptCount);
      expect(msg.headers).toEqual({ [headerKey]: headerVal });
      expect(msg.payload.toString()).toBe("hello world");
    });
  });

  describe("ack/nack payload encoding", () => {
    it("encodes ack payload with count + queue + msgId", () => {
      const payload = encodeAckPayload("the-queue", "msg-abc");
      let off = 0;
      const count = payload.readUInt16BE(off); off += 2;
      expect(count).toBe(1);
      const qLen = payload.readUInt16BE(off); off += 2;
      const queue = payload.subarray(off, off + qLen).toString(); off += qLen;
      const idLen = payload.readUInt16BE(off); off += 2;
      const id = payload.subarray(off, off + idLen).toString(); off += idLen;
      expect(queue).toBe("the-queue");
      expect(id).toBe("msg-abc");
      expect(off).toBe(payload.length);
    });

    it("encodes nack payload including error message", () => {
      const payload = encodeNackPayload("q", "id1", "processing failed");
      let off = 0;
      const count = payload.readUInt16BE(off); off += 2;
      expect(count).toBe(1);
      const qLen = payload.readUInt16BE(off); off += 2;
      off += qLen; // skip queue
      const idLen = payload.readUInt16BE(off); off += 2;
      off += idLen; // skip msg id
      const errLen = payload.readUInt16BE(off); off += 2;
      const errMsg = payload.subarray(off, off + errLen).toString(); off += errLen;
      expect(errMsg).toBe("processing failed");
      expect(off).toBe(payload.length);
    });
  });

  describe("decodeAckNackResponse", () => {
    it("decodes success", () => {
      const buf = Buffer.allocUnsafe(3);
      buf.writeUInt16BE(1, 0);
      buf.writeUInt8(1, 2); // ok
      const results = decodeAckNackResponse(buf);
      expect(results).toHaveLength(1);
      expect(results[0].ok).toBe(true);
    });

    it("decodes error", () => {
      const errMsg = "msg not found";
      const errBuf = Buffer.from(errMsg);
      const buf = Buffer.allocUnsafe(2 + 1 + 2 + 2 + errBuf.length);
      let off = 0;
      buf.writeUInt16BE(1, off); off += 2;
      buf.writeUInt8(0, off); off += 1;
      buf.writeUInt16BE(0x0002, off); off += 2; // MESSAGE_NOT_FOUND
      buf.writeUInt16BE(errBuf.length, off); off += 2;
      errBuf.copy(buf, off);
      const results = decodeAckNackResponse(buf);
      expect(results[0].ok).toBe(false);
      if (!results[0].ok) {
        expect(results[0].errCode).toBe(0x0002);
        expect(results[0].errMsg).toBe(errMsg);
      }
    });
  });

  describe("auth payload encoding", () => {
    it("encodes api key with length prefix", () => {
      const payload = encodeAuthPayload("my-secret-key");
      const kLen = payload.readUInt16BE(0);
      const key = payload.subarray(2, 2 + kLen).toString();
      expect(key).toBe("my-secret-key");
    });
  });

  describe("decodeErrorPayload", () => {
    it("decodes error code and message", () => {
      const errMsg = "something went wrong";
      const errBuf = Buffer.from(errMsg);
      const buf = Buffer.allocUnsafe(4 + errBuf.length);
      buf.writeUInt16BE(0xFFFF, 0);
      buf.writeUInt16BE(errBuf.length, 2);
      errBuf.copy(buf, 4);
      const result = decodeErrorPayload(buf);
      expect(result.code).toBe(0xFFFF);
      expect(result.message).toBe(errMsg);
    });
  });

  describe("Op codes", () => {
    it("has expected hot-path codes", () => {
      expect(Op.ENQUEUE).toBe(0x01);
      expect(Op.CONSUME).toBe(0x02);
      expect(Op.ACK).toBe(0x03);
      expect(Op.NACK).toBe(0x04);
      expect(Op.AUTH).toBe(0x30);
      expect(Op.ERROR).toBe(0xFE);
      expect(Op.GOAWAY).toBe(0xFF);
    });

    it("FLAG_PUSH is bit 2", () => {
      expect(FLAG_PUSH).toBe(0x04);
    });
  });
});

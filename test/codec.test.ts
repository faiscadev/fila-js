import { describe, it, expect } from "vitest";
import { Encoder, Decoder, FrameReader, encodeFrame } from "../src/fibp";

describe("FIBP codec", () => {
  describe("Encoder/Decoder round-trips", () => {
    it("u8", () => {
      const enc = new Encoder();
      enc.writeU8(0);
      enc.writeU8(255);
      const dec = new Decoder(enc.finish());
      expect(dec.readU8()).toBe(0);
      expect(dec.readU8()).toBe(255);
    });

    it("u16", () => {
      const enc = new Encoder();
      enc.writeU16(0);
      enc.writeU16(65535);
      const dec = new Decoder(enc.finish());
      expect(dec.readU16()).toBe(0);
      expect(dec.readU16()).toBe(65535);
    });

    it("u32", () => {
      const enc = new Encoder();
      enc.writeU32(0);
      enc.writeU32(0xffffffff);
      const dec = new Decoder(enc.finish());
      expect(dec.readU32()).toBe(0);
      expect(dec.readU32()).toBe(0xffffffff);
    });

    it("u64", () => {
      const enc = new Encoder();
      enc.writeU64(BigInt(0));
      enc.writeU64(BigInt("18446744073709551615"));
      const dec = new Decoder(enc.finish());
      expect(dec.readU64()).toBe(BigInt(0));
      expect(dec.readU64()).toBe(BigInt("18446744073709551615"));
    });

    it("i64", () => {
      const enc = new Encoder();
      enc.writeI64(BigInt(-1));
      enc.writeI64(BigInt("9223372036854775807"));
      const dec = new Decoder(enc.finish());
      expect(dec.readI64()).toBe(BigInt(-1));
      expect(dec.readI64()).toBe(BigInt("9223372036854775807"));
    });

    it("f64", () => {
      const enc = new Encoder();
      enc.writeF64(3.14);
      enc.writeF64(-0.0);
      const dec = new Decoder(enc.finish());
      expect(dec.readF64()).toBeCloseTo(3.14);
      expect(dec.readF64()).toBe(-0.0);
    });

    it("bool", () => {
      const enc = new Encoder();
      enc.writeBool(true);
      enc.writeBool(false);
      const dec = new Decoder(enc.finish());
      expect(dec.readBool()).toBe(true);
      expect(dec.readBool()).toBe(false);
    });

    it("string", () => {
      const enc = new Encoder();
      enc.writeString("");
      enc.writeString("hello world");
      enc.writeString("emoji \u{1F600}");
      const dec = new Decoder(enc.finish());
      expect(dec.readString()).toBe("");
      expect(dec.readString()).toBe("hello world");
      expect(dec.readString()).toBe("emoji \u{1F600}");
    });

    it("bytes", () => {
      const enc = new Encoder();
      enc.writeBytes(Buffer.alloc(0));
      enc.writeBytes(Buffer.from([1, 2, 3]));
      const dec = new Decoder(enc.finish());
      expect(dec.readBytes()).toEqual(Buffer.alloc(0));
      expect(dec.readBytes()).toEqual(Buffer.from([1, 2, 3]));
    });

    it("map", () => {
      const enc = new Encoder();
      enc.writeMap({});
      enc.writeMap({ a: "1", b: "2" });
      const dec = new Decoder(enc.finish());
      expect(dec.readMap()).toEqual({});
      expect(dec.readMap()).toEqual({ a: "1", b: "2" });
    });

    it("string array", () => {
      const enc = new Encoder();
      enc.writeStringArray([]);
      enc.writeStringArray(["foo", "bar"]);
      const dec = new Decoder(enc.finish());
      expect(dec.readStringArray()).toEqual([]);
      expect(dec.readStringArray()).toEqual(["foo", "bar"]);
    });

    it("optional string", () => {
      const enc = new Encoder();
      enc.writeOptionalString(null);
      enc.writeOptionalString("present");
      const dec = new Decoder(enc.finish());
      expect(dec.readOptionalString()).toBeNull();
      expect(dec.readOptionalString()).toBe("present");
    });
  });

  describe("FrameReader", () => {
    it("reads a single frame", () => {
      const payload = Buffer.from("test");
      const wire = encodeFrame(0x10, 0, 42, payload);

      const reader = new FrameReader();
      const frames = reader.feed(wire);
      expect(frames).toHaveLength(1);
      expect(frames[0].opcode).toBe(0x10);
      expect(frames[0].requestId).toBe(42);
      expect(frames[0].payload.toString()).toBe("test");
    });

    it("reads multiple frames from a single buffer", () => {
      const f1 = encodeFrame(0x01, 0, 1, Buffer.from("a"));
      const f2 = encodeFrame(0x02, 0, 2, Buffer.from("b"));
      const combined = Buffer.concat([f1, f2]);

      const reader = new FrameReader();
      const frames = reader.feed(combined);
      expect(frames).toHaveLength(2);
      expect(frames[0].opcode).toBe(0x01);
      expect(frames[1].opcode).toBe(0x02);
    });

    it("handles partial frames across multiple feeds", () => {
      const wire = encodeFrame(0x10, 0, 1, Buffer.from("hello"));

      const reader = new FrameReader();
      // Feed partial data.
      const part1 = wire.subarray(0, 5);
      const part2 = wire.subarray(5);

      expect(reader.feed(part1)).toHaveLength(0);
      const frames = reader.feed(part2);
      expect(frames).toHaveLength(1);
      expect(frames[0].payload.toString()).toBe("hello");
    });

    it("reassembles continuation frames", () => {
      const p1 = encodeFrame(0x10, 0x01, 1, Buffer.from("hello"));
      const p2 = encodeFrame(0x10, 0x00, 1, Buffer.from(" world"));

      const reader = new FrameReader();
      expect(reader.feed(p1)).toHaveLength(0); // continuation
      const frames = reader.feed(p2);
      expect(frames).toHaveLength(1);
      expect(frames[0].payload.toString()).toBe("hello world");
      expect(frames[0].opcode).toBe(0x10);
      expect(frames[0].requestId).toBe(1);
    });
  });

  describe("Decoder underflow", () => {
    it("throws on underflow", () => {
      const dec = new Decoder(Buffer.alloc(0));
      expect(() => dec.readU8()).toThrow("decode underflow");
    });
  });
});

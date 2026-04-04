/**
 * FIBP encoding/decoding primitives and frame-level codec.
 *
 * All multi-byte integers are big-endian (network byte order).
 */

import {
  FRAME_HEADER_SIZE,
  FRAME_LENGTH_PREFIX_SIZE,
  FLAG_CONTINUATION,
} from "./constants";

// ---------------------------------------------------------------------------
// Encoder — writes into a growing Buffer
// ---------------------------------------------------------------------------

export class Encoder {
  private buf: Buffer;
  private pos = 0;

  constructor(initialCapacity = 256) {
    this.buf = Buffer.allocUnsafe(initialCapacity);
  }

  /** Ensure at least `needed` bytes are available. */
  private grow(needed: number): void {
    const remaining = this.buf.length - this.pos;
    if (remaining >= needed) return;
    let newSize = this.buf.length * 2;
    while (newSize - this.pos < needed) newSize *= 2;
    const next = Buffer.allocUnsafe(newSize);
    this.buf.copy(next, 0, 0, this.pos);
    this.buf = next;
  }

  writeU8(v: number): void {
    this.grow(1);
    this.buf[this.pos++] = v & 0xff;
  }

  writeU16(v: number): void {
    this.grow(2);
    this.buf.writeUInt16BE(v, this.pos);
    this.pos += 2;
  }

  writeU32(v: number): void {
    this.grow(4);
    this.buf.writeUInt32BE(v, this.pos);
    this.pos += 4;
  }

  writeU64(v: bigint): void {
    this.grow(8);
    this.buf.writeBigUInt64BE(v, this.pos);
    this.pos += 8;
  }

  writeI64(v: bigint): void {
    this.grow(8);
    this.buf.writeBigInt64BE(v, this.pos);
    this.pos += 8;
  }

  writeF64(v: number): void {
    this.grow(8);
    this.buf.writeDoubleBE(v, this.pos);
    this.pos += 8;
  }

  writeBool(v: boolean): void {
    this.writeU8(v ? 1 : 0);
  }

  /** Write a length-prefixed string (u16 length + UTF-8 bytes). */
  writeString(s: string): void {
    const bytes = Buffer.from(s, "utf8");
    if (bytes.length > 0xffff) throw new Error(`string too long: ${bytes.length} bytes`);
    this.writeU16(bytes.length);
    this.grow(bytes.length);
    bytes.copy(this.buf, this.pos);
    this.pos += bytes.length;
  }

  /** Write length-prefixed bytes (u32 length + raw). */
  writeBytes(b: Buffer): void {
    this.writeU32(b.length);
    this.grow(b.length);
    b.copy(this.buf, this.pos);
    this.pos += b.length;
  }

  /** Write a map<string,string>: u16 count + repeated (string key, string value). */
  writeMap(m: Record<string, string>): void {
    const entries = Object.entries(m);
    this.writeU16(entries.length);
    for (const [k, v] of entries) {
      this.writeString(k);
      this.writeString(v);
    }
  }

  /** Write a string[]: u16 count + repeated string. */
  writeStringArray(arr: string[]): void {
    this.writeU16(arr.length);
    for (const s of arr) {
      this.writeString(s);
    }
  }

  /** Write optional<T>: u8 present flag, then T if present. */
  writeOptionalString(s: string | null | undefined): void {
    if (s != null) {
      this.writeU8(1);
      this.writeString(s);
    } else {
      this.writeU8(0);
    }
  }

  /** Raw bytes copy. */
  writeRaw(b: Buffer): void {
    this.grow(b.length);
    b.copy(this.buf, this.pos);
    this.pos += b.length;
  }

  /** Return the written portion as a Buffer (shared memory — do not mutate). */
  finish(): Buffer {
    return this.buf.subarray(0, this.pos);
  }
}

// ---------------------------------------------------------------------------
// Decoder — reads from a Buffer
// ---------------------------------------------------------------------------

export class Decoder {
  private readonly buf: Buffer;
  private pos: number;

  constructor(buf: Buffer, offset = 0) {
    this.buf = buf;
    this.pos = offset;
  }

  get remaining(): number {
    return this.buf.length - this.pos;
  }

  get offset(): number {
    return this.pos;
  }

  private check(n: number): void {
    if (this.pos + n > this.buf.length) {
      throw new Error(`decode underflow: need ${n}, have ${this.buf.length - this.pos}`);
    }
  }

  readU8(): number {
    this.check(1);
    return this.buf[this.pos++];
  }

  readU16(): number {
    this.check(2);
    const v = this.buf.readUInt16BE(this.pos);
    this.pos += 2;
    return v;
  }

  readU32(): number {
    this.check(4);
    const v = this.buf.readUInt32BE(this.pos);
    this.pos += 4;
    return v;
  }

  readU64(): bigint {
    this.check(8);
    const v = this.buf.readBigUInt64BE(this.pos);
    this.pos += 8;
    return v;
  }

  readI64(): bigint {
    this.check(8);
    const v = this.buf.readBigInt64BE(this.pos);
    this.pos += 8;
    return v;
  }

  readF64(): number {
    this.check(8);
    const v = this.buf.readDoubleBE(this.pos);
    this.pos += 8;
    return v;
  }

  readBool(): boolean {
    return this.readU8() !== 0;
  }

  readString(): string {
    const len = this.readU16();
    this.check(len);
    const s = this.buf.toString("utf8", this.pos, this.pos + len);
    this.pos += len;
    return s;
  }

  readBytes(): Buffer {
    const len = this.readU32();
    this.check(len);
    const b = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return b;
  }

  readMap(): Record<string, string> {
    const count = this.readU16();
    const m: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      const k = this.readString();
      const v = this.readString();
      m[k] = v;
    }
    return m;
  }

  readStringArray(): string[] {
    const count = this.readU16();
    const arr: string[] = [];
    for (let i = 0; i < count; i++) {
      arr.push(this.readString());
    }
    return arr;
  }

  readOptionalString(): string | null {
    const present = this.readU8();
    if (present) return this.readString();
    return null;
  }
}

// ---------------------------------------------------------------------------
// Frame structure
// ---------------------------------------------------------------------------

export interface Frame {
  opcode: number;
  flags: number;
  requestId: number;
  payload: Buffer;
}

/**
 * Build a complete wire frame: [u32 frame_length][u8 opcode][u8 flags][u32 request_id][payload].
 */
export function encodeFrame(
  opcode: number,
  flags: number,
  requestId: number,
  payload: Buffer
): Buffer {
  const frameLen = FRAME_HEADER_SIZE + payload.length;
  const wire = Buffer.allocUnsafe(FRAME_LENGTH_PREFIX_SIZE + frameLen);
  wire.writeUInt32BE(frameLen, 0);
  wire[4] = opcode;
  wire[5] = flags;
  wire.writeUInt32BE(requestId, 6);
  payload.copy(wire, 10);
  return wire;
}

/**
 * FrameReader accumulates bytes from a TCP stream and emits complete frames.
 * Handles continuation frames by reassembling them transparently.
 */
export class FrameReader {
  private buffer = Buffer.alloc(0);
  /** Continuation buffers keyed by `opcode:requestId`. */
  private continuations = new Map<string, Buffer[]>();

  /**
   * Feed incoming data and return any complete, reassembled frames.
   */
  feed(data: Buffer): Frame[] {
    this.buffer = Buffer.concat([this.buffer, data]);
    const frames: Frame[] = [];

    while (this.buffer.length >= FRAME_LENGTH_PREFIX_SIZE) {
      const frameLen = this.buffer.readUInt32BE(0);
      const totalLen = FRAME_LENGTH_PREFIX_SIZE + frameLen;
      if (this.buffer.length < totalLen) break;

      if (frameLen < FRAME_HEADER_SIZE) {
        // Malformed — skip this frame.
        this.buffer = this.buffer.subarray(totalLen);
        continue;
      }

      const opcode = this.buffer[4];
      const flags = this.buffer[5];
      const requestId = this.buffer.readUInt32BE(6);
      const payload = this.buffer.subarray(10, totalLen);
      this.buffer = this.buffer.subarray(totalLen);

      const isContinuation = (flags & FLAG_CONTINUATION) !== 0;
      const key = `${opcode}:${requestId}`;

      if (isContinuation) {
        // Buffer continuation chunk.
        let chunks = this.continuations.get(key);
        if (!chunks) {
          chunks = [];
          this.continuations.set(key, chunks);
        }
        chunks.push(Buffer.from(payload));
      } else {
        // Final frame — may be standalone or the last continuation chunk.
        const chunks = this.continuations.get(key);
        if (chunks) {
          chunks.push(Buffer.from(payload));
          this.continuations.delete(key);
          frames.push({
            opcode,
            flags: 0,
            requestId,
            payload: Buffer.concat(chunks),
          });
        } else {
          frames.push({
            opcode,
            flags: 0,
            requestId,
            payload: Buffer.from(payload),
          });
        }
      }
    }

    return frames;
  }
}

/**
 * FIBP (Fila Binary Protocol) transport layer.
 *
 * Wire format:
 *   [4-byte big-endian frame length][flags:u8 | op:u8 | corr_id:u32 | payload]
 *
 * The frame length field encodes the byte count of everything AFTER it
 * (i.e. flags + op + corr_id + payload).
 *
 * Handshake: client sends 6 bytes "FIBP\x01\x00"; server echoes same 6 bytes.
 */

import * as net from "net";
import * as tls from "tls";
import { EventEmitter } from "events";
import { FilaError, RPCError } from "./errors";

// ---- Op codes ---------------------------------------------------------------

export const Op = {
  ENQUEUE:      0x01,
  CONSUME:      0x02,
  ACK:          0x03,
  NACK:         0x04,

  // Admin
  CREATE_QUEUE: 0x10,
  DELETE_QUEUE: 0x11,
  QUEUE_STATS:  0x12,
  LIST_QUEUES:  0x13,
  PAUSE_QUEUE:  0x14,
  RESUME_QUEUE: 0x15,
  REDRIVE:      0x16,

  // Flow / keepalive
  FLOW:         0x20,
  HEARTBEAT:    0x21,

  // Auth
  AUTH:         0x30,

  // Server-to-client
  ERROR:        0xFE,
  GOAWAY:       0xFF,
} as const;

export type OpCode = typeof Op[keyof typeof Op];

// ---- Error codes (wire level) -----------------------------------------------

export const ErrCode = {
  QUEUE_NOT_FOUND:   0x0001,
  MESSAGE_NOT_FOUND: 0x0002,
  UNAUTHORIZED:      0x0003,
  INTERNAL:          0xFFFF,
} as const;

// ---- Flags ------------------------------------------------------------------

/** Bit 2 (0x04): frame carries pushed message data (server → client push). */
export const FLAG_PUSH = 0x04;

// ---- Handshake --------------------------------------------------------------

export const HANDSHAKE = Buffer.from([0x46, 0x49, 0x42, 0x50, 0x01, 0x00]); // "FIBP\x01\x00"

// ---- Frame header sizes -----------------------------------------------------

// 4 bytes length prefix
const LENGTH_PREFIX = 4;
// flags(1) + op(1) + corr_id(4) = 6 bytes header inside the frame
const FRAME_HEADER = 6;
const MIN_FRAME = FRAME_HEADER; // smallest valid frame (no payload)

// ---- Types ------------------------------------------------------------------

export interface Frame {
  flags: number;
  op: number;
  corrId: number;
  payload: Buffer;
}

// ---- Correlation ID counter -------------------------------------------------

let corrIdCounter = 0;
export function nextCorrId(): number {
  corrIdCounter = (corrIdCounter + 1) & 0xFFFFFFFF;
  // Avoid 0 — reserved for server-push frames
  if (corrIdCounter === 0) corrIdCounter = 1;
  return corrIdCounter;
}

// ---- Frame encoding ---------------------------------------------------------

/** Encode a FIBP frame into a Buffer ready to write to the socket. */
export function encodeFrame(op: number, corrId: number, payload: Buffer, flags = 0): Buffer {
  const frameLen = FRAME_HEADER + payload.length;
  const buf = Buffer.allocUnsafe(LENGTH_PREFIX + frameLen);
  let offset = 0;
  buf.writeUInt32BE(frameLen, offset); offset += 4;
  buf.writeUInt8(flags, offset);       offset += 1;
  buf.writeUInt8(op, offset);          offset += 1;
  buf.writeUInt32BE(corrId, offset);   offset += 4;
  payload.copy(buf, offset);
  return buf;
}

// ---- Enqueue wire encoding --------------------------------------------------

/** Encode a batch of enqueue messages into the FIBP binary payload. */
export function encodeEnqueuePayload(
  messages: Array<{ queue: string; headers: Record<string, string>; payload: Buffer }>
): Buffer {
  const parts: Buffer[] = [];

  // Group by queue name (but preserve per-message order for response mapping).
  // The protocol sends all messages for a single queue in one request.
  // Since our API allows multi-queue batches, we send one frame per unique queue.
  // This function encodes a single-queue batch only; callers must split by queue.
  const queue = messages[0]?.queue ?? "";
  const queueBuf = Buffer.from(queue, "utf8");

  const header = Buffer.allocUnsafe(2 + queueBuf.length + 2);
  header.writeUInt16BE(queueBuf.length, 0);
  queueBuf.copy(header, 2);
  header.writeUInt16BE(messages.length, 2 + queueBuf.length);
  parts.push(header);

  for (const msg of messages) {
    parts.push(encodeMessageEntry(msg.headers, msg.payload));
  }

  return Buffer.concat(parts);
}

function encodeMessageEntry(
  headers: Record<string, string>,
  payload: Buffer
): Buffer {
  const headerEntries = Object.entries(headers);
  const entriesBufs: Buffer[] = [];

  for (const [k, v] of headerEntries) {
    const kBuf = Buffer.from(k, "utf8");
    const vBuf = Buffer.from(v, "utf8");
    const entryBuf = Buffer.allocUnsafe(2 + kBuf.length + 2 + vBuf.length);
    let off = 0;
    entryBuf.writeUInt16BE(kBuf.length, off); off += 2;
    kBuf.copy(entryBuf, off); off += kBuf.length;
    entryBuf.writeUInt16BE(vBuf.length, off); off += 2;
    vBuf.copy(entryBuf, off);
    entriesBufs.push(entryBuf);
  }

  const countBuf = Buffer.allocUnsafe(1);
  countBuf.writeUInt8(headerEntries.length, 0);

  const payloadLenBuf = Buffer.allocUnsafe(4);
  payloadLenBuf.writeUInt32BE(payload.length, 0);

  return Buffer.concat([countBuf, ...entriesBufs, payloadLenBuf, payload]);
}

// ---- Enqueue response decoding ----------------------------------------------

export type EnqueueItemResult =
  | { ok: true; msgId: string }
  | { ok: false; errCode: number; errMsg: string };

/** Decode an ENQUEUE response payload. */
export function decodeEnqueueResponse(payload: Buffer): EnqueueItemResult[] {
  let offset = 0;
  const count = payload.readUInt16BE(offset); offset += 2;
  const results: EnqueueItemResult[] = [];

  for (let i = 0; i < count; i++) {
    const ok = payload.readUInt8(offset); offset += 1;
    if (ok === 1) {
      const idLen = payload.readUInt16BE(offset); offset += 2;
      const msgId = payload.subarray(offset, offset + idLen).toString("utf8"); offset += idLen;
      results.push({ ok: true, msgId });
    } else {
      const errCode = payload.readUInt16BE(offset); offset += 2;
      const errLen = payload.readUInt16BE(offset); offset += 2;
      const errMsg = payload.subarray(offset, offset + errLen).toString("utf8"); offset += errLen;
      results.push({ ok: false, errCode, errMsg });
    }
  }

  return results;
}

// ---- Consume wire encoding / decoding ---------------------------------------

/** Encode a CONSUME request payload. */
export function encodeConsumePayload(queue: string, initialCredits: number): Buffer {
  const queueBuf = Buffer.from(queue, "utf8");
  const buf = Buffer.allocUnsafe(2 + queueBuf.length + 4);
  let off = 0;
  buf.writeUInt16BE(queueBuf.length, off); off += 2;
  queueBuf.copy(buf, off); off += queueBuf.length;
  buf.writeUInt32BE(initialCredits, off);
  return buf;
}

export interface WireMessage {
  id: string;
  headers: Record<string, string>;
  payload: Buffer;
  fairnessKey: string;
  attemptCount: number;
  queue: string;
}

/**
 * Decode a pushed consume delivery payload.
 *
 * Wire layout (server → client push with FLAG_PUSH set):
 *   msg_count:u16BE | messages...
 *
 * Each message:
 *   id_len:u16BE + id:utf8
 *   queue_len:u16BE + queue:utf8
 *   fairness_key_len:u16BE + fairness_key:utf8
 *   attempt_count:u32BE
 *   header_count:u8
 *   headers: repeated(key_len:u16BE+key + val_len:u16BE+val)
 *   payload_len:u32BE + payload
 */
export function decodeConsumeDelivery(payload: Buffer): WireMessage[] {
  let offset = 0;
  const count = payload.readUInt16BE(offset); offset += 2;
  const messages: WireMessage[] = [];

  for (let i = 0; i < count; i++) {
    // id
    const idLen = payload.readUInt16BE(offset); offset += 2;
    const id = payload.subarray(offset, offset + idLen).toString("utf8"); offset += idLen;

    // queue
    const queueLen = payload.readUInt16BE(offset); offset += 2;
    const queue = payload.subarray(offset, offset + queueLen).toString("utf8"); offset += queueLen;

    // fairness key
    const fkLen = payload.readUInt16BE(offset); offset += 2;
    const fairnessKey = payload.subarray(offset, offset + fkLen).toString("utf8"); offset += fkLen;

    // attempt count
    const attemptCount = payload.readUInt32BE(offset); offset += 4;

    // headers
    const headerCount = payload.readUInt8(offset); offset += 1;
    const headers: Record<string, string> = {};
    for (let h = 0; h < headerCount; h++) {
      const kLen = payload.readUInt16BE(offset); offset += 2;
      const k = payload.subarray(offset, offset + kLen).toString("utf8"); offset += kLen;
      const vLen = payload.readUInt16BE(offset); offset += 2;
      const v = payload.subarray(offset, offset + vLen).toString("utf8"); offset += vLen;
      headers[k] = v;
    }

    // payload
    const payloadLen = payload.readUInt32BE(offset); offset += 4;
    const msgPayload = Buffer.from(payload.subarray(offset, offset + payloadLen)); offset += payloadLen;

    messages.push({ id, queue, fairnessKey, attemptCount, headers, payload: msgPayload });
  }

  return messages;
}

// ---- Ack/Nack wire encoding -------------------------------------------------

/** Encode an ACK payload: item_count:u16BE | items(queue+msg_id) */
export function encodeAckPayload(queue: string, msgId: string): Buffer {
  return encodeAckNackItems([{ queue, msgId }]);
}

function encodeAckNackItems(items: Array<{ queue: string; msgId: string }>): Buffer {
  const parts: Buffer[] = [];
  const countBuf = Buffer.allocUnsafe(2);
  countBuf.writeUInt16BE(items.length, 0);
  parts.push(countBuf);

  for (const item of items) {
    const qBuf = Buffer.from(item.queue, "utf8");
    const idBuf = Buffer.from(item.msgId, "utf8");
    const entry = Buffer.allocUnsafe(2 + qBuf.length + 2 + idBuf.length);
    let off = 0;
    entry.writeUInt16BE(qBuf.length, off); off += 2;
    qBuf.copy(entry, off); off += qBuf.length;
    entry.writeUInt16BE(idBuf.length, off); off += 2;
    idBuf.copy(entry, off);
    parts.push(entry);
  }

  return Buffer.concat(parts);
}

/** Encode a NACK payload: same as ACK items + err_len:u16BE + err_msg per item */
export function encodeNackPayload(queue: string, msgId: string, error: string): Buffer {
  const qBuf = Buffer.from(queue, "utf8");
  const idBuf = Buffer.from(msgId, "utf8");
  const errBuf = Buffer.from(error, "utf8");

  const countBuf = Buffer.allocUnsafe(2);
  countBuf.writeUInt16BE(1, 0);

  const entry = Buffer.allocUnsafe(2 + qBuf.length + 2 + idBuf.length + 2 + errBuf.length);
  let off = 0;
  entry.writeUInt16BE(qBuf.length, off); off += 2;
  qBuf.copy(entry, off); off += qBuf.length;
  entry.writeUInt16BE(idBuf.length, off); off += 2;
  idBuf.copy(entry, off); off += idBuf.length;
  entry.writeUInt16BE(errBuf.length, off); off += 2;
  errBuf.copy(entry, off);

  return Buffer.concat([countBuf, entry]);
}

// ---- Ack/Nack response decoding ---------------------------------------------

export type AckNackItemResult =
  | { ok: true }
  | { ok: false; errCode: number; errMsg: string };

/** Decode an ACK or NACK response payload. */
export function decodeAckNackResponse(payload: Buffer): AckNackItemResult[] {
  let offset = 0;
  const count = payload.readUInt16BE(offset); offset += 2;
  const results: AckNackItemResult[] = [];

  for (let i = 0; i < count; i++) {
    const ok = payload.readUInt8(offset); offset += 1;
    if (ok === 1) {
      results.push({ ok: true });
    } else {
      const errCode = payload.readUInt16BE(offset); offset += 2;
      const errLen = payload.readUInt16BE(offset); offset += 2;
      const errMsg = payload.subarray(offset, offset + errLen).toString("utf8"); offset += errLen;
      results.push({ ok: false, errCode, errMsg });
    }
  }

  return results;
}

// ---- Auth encoding ----------------------------------------------------------

/** Encode an AUTH frame payload: key_len:u16BE + key:utf8 */
export function encodeAuthPayload(apiKey: string): Buffer {
  const keyBuf = Buffer.from(apiKey, "utf8");
  const buf = Buffer.allocUnsafe(2 + keyBuf.length);
  buf.writeUInt16BE(keyBuf.length, 0);
  keyBuf.copy(buf, 2);
  return buf;
}

// ---- Error frame decoding ---------------------------------------------------

/** Decode an ERROR frame payload: err_code:u16BE + msg_len:u16BE + msg:utf8 */
export function decodeErrorPayload(payload: Buffer): { code: number; message: string } {
  const code = payload.readUInt16BE(0);
  const msgLen = payload.readUInt16BE(2);
  const message = payload.subarray(4, 4 + msgLen).toString("utf8");
  return { code, message };
}

// ---- Connection class -------------------------------------------------------

type PendingEntry =
  | { kind: "once"; resolve: (frame: Frame) => void; reject: (err: Error) => void }
  | { kind: "stream"; push: (frame: Frame) => void; end: (err?: Error) => void };

/**
 * A multiplexed FIBP connection over a single TCP (or TLS) socket.
 *
 * Lifecycle:
 *   const conn = await FibpConnection.connect({ host, port, ... });
 *   const frame = await conn.request(op, payload);
 *   conn.destroy();
 */
export class FibpConnection extends EventEmitter {
  private readonly socket: net.Socket;
  private readBuf = Buffer.alloc(0);
  private pending = new Map<number, PendingEntry>();
  private _closed = false;

  /** push listeners for server-initiated push frames (corrId == 0) */
  private pushHandlers = new Map<string, (frame: Frame) => void>();

  private constructor(socket: net.Socket) {
    super();
    this.socket = socket;
    socket.on("data", (chunk: Buffer) => this.onData(chunk));
    socket.on("error", (err) => this.onSocketError(err));
    socket.on("close", () => this.onSocketClose());
  }

  get closed(): boolean {
    return this._closed;
  }

  // ---- Factory --------------------------------------------------------------

  static connect(opts: ConnectOptions): Promise<FibpConnection> {
    return new Promise((resolve, reject) => {
      let socket: net.Socket;

      const tlsEnabled = opts.tls || opts.caCert;

      if (tlsEnabled) {
        const tlsOpts: tls.ConnectionOptions = {
          host: opts.host,
          port: opts.port,
          rejectUnauthorized: true,
        };
        if (opts.caCert) {
          tlsOpts.ca = opts.caCert;
        }
        if (opts.clientCert && opts.clientKey) {
          tlsOpts.cert = opts.clientCert;
          tlsOpts.key = opts.clientKey;
        }
        socket = tls.connect(tlsOpts);
      } else {
        socket = net.connect({ host: opts.host, port: opts.port });
      }

      socket.once("error", reject);

      const connectEvent = tlsEnabled ? "secureConnect" : "connect";
      socket.once(connectEvent, async () => {
        socket.removeListener("error", reject);
        try {
          await performHandshake(socket);
          const conn = new FibpConnection(socket);
          // Authenticate immediately if apiKey provided.
          if (opts.apiKey) {
            await conn.authenticate(opts.apiKey);
          }
          resolve(conn);
        } catch (err) {
          socket.destroy();
          reject(err);
        }
      });
    });
  }

  // ---- Auth -----------------------------------------------------------------

  private async authenticate(apiKey: string): Promise<void> {
    const payload = encodeAuthPayload(apiKey);
    await this.request(Op.AUTH, payload);
  }

  // ---- Request/Response multiplexing ----------------------------------------

  /**
   * Send a request frame and await a single response frame.
   * Rejects if the server responds with an ERROR frame or the connection closes.
   */
  request(op: number, payload: Buffer): Promise<Frame> {
    return new Promise((resolve, reject) => {
      if (this._closed) {
        reject(new RPCError(ErrCode.INTERNAL, "connection closed"));
        return;
      }
      const corrId = nextCorrId();
      this.pending.set(corrId, { kind: "once", resolve, reject });
      const frame = encodeFrame(op, corrId, payload);
      this.socket.write(frame, (err) => {
        if (err) {
          this.pending.delete(corrId);
          reject(new FilaError(`write error: ${err.message}`));
        }
      });
    });
  }

  /**
   * Send a stream-initiation frame and return an AsyncIterable of pushed frames.
   * Frames with FLAG_PUSH are dispatched here; the stream ends when the socket
   * closes or the server sends a GOAWAY.
   *
   * The corrId is returned so the caller can cancel if needed.
   */
  openStream(op: number, payload: Buffer): { corrId: number; iter: AsyncIterable<Frame> } {
    const corrId = nextCorrId();

    // Build an async iterable backed by a queue + promise chain.
    const queue: Frame[] = [];
    let ended = false;
    let endError: Error | undefined;
    let waiter: { resolve: (v: IteratorResult<Frame>) => void; reject: (e: Error) => void } | null = null;

    const push = (frame: Frame) => {
      if (waiter) {
        const w = waiter;
        waiter = null;
        w.resolve({ done: false, value: frame });
      } else {
        queue.push(frame);
      }
    };

    const end = (err?: Error) => {
      ended = true;
      endError = err;
      this.pending.delete(corrId);
      if (waiter) {
        const w = waiter;
        waiter = null;
        if (err) {
          w.reject(err);
        } else {
          w.resolve({ done: true, value: undefined as unknown as Frame });
        }
      }
    };

    this.pending.set(corrId, { kind: "stream", push, end });

    const frame = encodeFrame(op, corrId, payload);
    this.socket.write(frame, (err) => {
      if (err) {
        this.pending.delete(corrId);
        end(new FilaError(`write error: ${err.message}`));
      }
    });

    const iter: AsyncIterable<Frame> = {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<Frame>> {
            if (queue.length > 0) {
              return Promise.resolve({ done: false, value: queue.shift()! });
            }
            if (ended) {
              if (endError) return Promise.reject(endError);
              return Promise.resolve({ done: true, value: undefined as unknown as Frame });
            }
            return new Promise<IteratorResult<Frame>>((resolve, reject) => {
              waiter = { resolve, reject };
            });
          },
          return(): Promise<IteratorResult<Frame>> {
            end();
            return Promise.resolve({ done: true, value: undefined as unknown as Frame });
          },
        };
      },
    };

    return { corrId, iter };
  }

  /** Cancel a stream by corrId (e.g. when consumer breaks out of for-await). */
  cancelStream(corrId: number): void {
    const entry = this.pending.get(corrId);
    if (entry?.kind === "stream") {
      entry.end();
    }
  }

  // ---- Socket data handling -------------------------------------------------

  private onData(chunk: Buffer): void {
    this.readBuf = Buffer.concat([this.readBuf, chunk]);
    this.parseFrames();
  }

  private parseFrames(): void {
    while (this.readBuf.length >= LENGTH_PREFIX + MIN_FRAME) {
      const frameLen = this.readBuf.readUInt32BE(0);
      if (this.readBuf.length < LENGTH_PREFIX + frameLen) break; // incomplete

      const frame = this.readBuf.subarray(0, LENGTH_PREFIX + frameLen);
      this.readBuf = Buffer.from(this.readBuf.subarray(LENGTH_PREFIX + frameLen));

      this.dispatchFrame(frame);
    }
  }

  private dispatchFrame(raw: Buffer): void {
    const flags  = raw.readUInt8(LENGTH_PREFIX);
    const op     = raw.readUInt8(LENGTH_PREFIX + 1);
    const corrId = raw.readUInt32BE(LENGTH_PREFIX + 2);
    const payload = Buffer.from(raw.subarray(LENGTH_PREFIX + FRAME_HEADER));

    const frame: Frame = { flags, op, corrId, payload };

    const entry = this.pending.get(corrId);
    if (!entry) {
      // No registered handler — could be a keepalive or unknown push.
      return;
    }

    if (op === Op.ERROR) {
      const { message } = decodeErrorPayload(payload);
      const err = new RPCError(ErrCode.INTERNAL, message);
      if (entry.kind === "once") {
        this.pending.delete(corrId);
        entry.reject(err);
      } else {
        entry.end(err);
      }
      return;
    }

    if (entry.kind === "once") {
      this.pending.delete(corrId);
      entry.resolve(frame);
    } else {
      // stream: push delivers messages; anything else ends the stream
      if (flags & FLAG_PUSH) {
        entry.push(frame);
      } else {
        // Non-push frame on a stream corrId → stream ended cleanly by server
        entry.end();
      }
    }
  }

  private onSocketError(err: Error): void {
    this._closed = true;
    const rpcErr = new FilaError(`connection error: ${err.message}`);
    for (const [, entry] of this.pending) {
      if (entry.kind === "once") {
        entry.reject(rpcErr);
      } else {
        entry.end(rpcErr);
      }
    }
    this.pending.clear();
    this.emit("error", err);
  }

  private onSocketClose(): void {
    this._closed = true;
    const rpcErr = new FilaError("connection closed by server");
    for (const [, entry] of this.pending) {
      if (entry.kind === "once") {
        entry.reject(rpcErr);
      } else {
        entry.end(rpcErr);
      }
    }
    this.pending.clear();
    this.emit("close");
  }

  // ---- Cleanup --------------------------------------------------------------

  destroy(): void {
    if (!this._closed) {
      this._closed = true;
      this.socket.destroy();
    }
  }
}

// ---- Handshake helper -------------------------------------------------------

function performHandshake(socket: net.Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.write(HANDSHAKE, (writeErr) => {
      if (writeErr) {
        reject(new FilaError(`handshake write error: ${writeErr.message}`));
        return;
      }
    });

    let buf = Buffer.alloc(0);

    const onData = (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length >= HANDSHAKE.length) {
        socket.removeListener("data", onData);
        socket.removeListener("error", onError);
        const echo = buf.subarray(0, HANDSHAKE.length);
        if (!echo.equals(HANDSHAKE)) {
          reject(new FilaError(`bad handshake response: ${echo.toString("hex")}`));
          return;
        }
        // Push any leftover bytes back so the frame parser sees them.
        if (buf.length > HANDSHAKE.length) {
          socket.unshift(buf.subarray(HANDSHAKE.length));
        }
        resolve();
      }
    };

    const onError = (err: Error) => {
      socket.removeListener("data", onData);
      reject(new FilaError(`handshake error: ${err.message}`));
    };

    socket.on("data", onData);
    socket.once("error", onError);
  });
}

// ---- ConnectOptions ---------------------------------------------------------

export interface ConnectOptions {
  host: string;
  port: number;
  tls?: boolean;
  caCert?: Buffer;
  clientCert?: Buffer;
  clientKey?: Buffer;
  apiKey?: string;
}

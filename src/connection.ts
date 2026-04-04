/**
 * FIBP TCP connection manager.
 *
 * Handles:
 * - TCP + optional TLS connection
 * - Handshake exchange
 * - Request/response multiplexing via request IDs
 * - Server-push Delivery frame routing
 * - Ping/Pong keepalive
 */

import * as net from "net";
import * as tls from "tls";
import { EventEmitter } from "events";

import {
  Encoder,
  Decoder,
  FrameReader,
  encodeFrame,
  type Frame,
  PROTOCOL_VERSION,
  DEFAULT_MAX_FRAME_SIZE,
  OP_HANDSHAKE,
  OP_HANDSHAKE_OK,
  OP_PING,
  OP_PONG,
  OP_DISCONNECT,
  OP_DELIVERY,
  OP_ERROR,
} from "./fibp";

export interface ConnectionOptions {
  /** Enable TLS using OS trust store. */
  tls?: boolean;
  /** CA certificate PEM for server verification. */
  caCert?: Buffer;
  /** Client certificate PEM for mTLS. */
  clientCert?: Buffer;
  /** Client private key PEM for mTLS. */
  clientKey?: Buffer;
  /** API key for authentication (sent in handshake). */
  apiKey?: string;
  /** Keepalive ping interval in ms (0 = disabled). Default: 15000. */
  pingIntervalMs?: number;
}

interface PendingRequest {
  resolve: (frame: Frame) => void;
  reject: (err: Error) => void;
}

/**
 * A single multiplexed FIBP connection.
 *
 * - `sendRequest()` sends a frame and returns a promise for the response.
 * - Delivery frames are emitted via the `delivery` event.
 * - ConsumeOk frames are routed to the pending request for that request ID.
 */
export class Connection extends EventEmitter {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private frameReader = new FrameReader();
  private nextRequestId = 1;
  private pending = new Map<number, PendingRequest>();
  /** Callbacks for consume streams: requestId -> delivery handler. */
  private consumeHandlers = new Map<number, (frame: Frame) => void>();
  private maxFrameSize = DEFAULT_MAX_FRAME_SIZE;
  private closed = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  /** Server node ID from handshake. */
  nodeId = BigInt(0);

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly opts: ConnectionOptions = {}
  ) {
    super();
  }

  /** Connect, perform TLS (if configured), and complete the FIBP handshake. */
  async connect(): Promise<void> {
    await this.openSocket();
    await this.handshake();
    this.connected = true;
    this.startPing();
  }

  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const useTls = !!this.opts.tls || !!this.opts.caCert;

      if (useTls) {
        const tlsOpts: tls.ConnectionOptions = {
          host: this.host,
          port: this.port,
          ca: this.opts.caCert ?? undefined,
          cert: this.opts.clientCert ?? undefined,
          key: this.opts.clientKey ?? undefined,
          // When no caCert is provided, use system trust store (default).
          rejectUnauthorized: true,
        };
        const sock = tls.connect(tlsOpts, () => {
          resolve();
        });
        sock.on("error", (err) => {
          if (!this.connected) {
            reject(err);
          } else {
            this.handleSocketError(err);
          }
        });
        this.setupSocket(sock);
      } else {
        const sock = net.createConnection({ host: this.host, port: this.port }, () => {
          resolve();
        });
        sock.on("error", (err) => {
          if (!this.connected) {
            reject(err);
          } else {
            this.handleSocketError(err);
          }
        });
        this.setupSocket(sock);
      }
    });
  }

  private setupSocket(sock: net.Socket | tls.TLSSocket): void {
    this.socket = sock;
    sock.on("data", (data: Buffer) => this.onData(data));
    sock.on("close", () => this.onClose());
  }

  private handleSocketError(err: Error): void {
    // Reject all pending requests.
    for (const [, req] of this.pending) {
      req.reject(err);
    }
    this.pending.clear();
    this.emit("error", err);
  }

  private onClose(): void {
    this.closed = true;
    this.stopPing();
    // Reject all pending.
    const err = new Error("connection closed");
    for (const [, req] of this.pending) {
      req.reject(err);
    }
    this.pending.clear();
    // Signal consume handlers.
    for (const [, handler] of this.consumeHandlers) {
      handler({ opcode: 0, flags: 0, requestId: 0, payload: Buffer.alloc(0) });
    }
    this.consumeHandlers.clear();
    this.emit("close");
  }

  private onData(data: Buffer): void {
    const frames = this.frameReader.feed(data);
    for (const frame of frames) {
      this.dispatch(frame);
    }
  }

  private dispatch(frame: Frame): void {
    const { opcode, requestId } = frame;

    // Pong response to server ping.
    if (opcode === OP_PING) {
      this.sendRaw(encodeFrame(OP_PONG, 0, requestId, Buffer.alloc(0)));
      return;
    }

    // Ignore pong (we don't track ping responses for now).
    if (opcode === OP_PONG) return;

    // Disconnect from server.
    if (opcode === OP_DISCONNECT) {
      this.close();
      return;
    }

    // Delivery frames go to consume handlers.
    if (opcode === OP_DELIVERY) {
      const handler = this.consumeHandlers.get(requestId);
      if (handler) handler(frame);
      return;
    }

    // Error frames and result frames go to pending requests.
    const req = this.pending.get(requestId);
    if (req) {
      this.pending.delete(requestId);
      req.resolve(frame);
      return;
    }

    // ConsumeOk also resolves the pending request, but we need to keep
    // the consume handler registered. Check if there's a pending request first.
    // (Already handled above since ConsumeOk goes to pending.)
  }

  private async handshake(): Promise<void> {
    const enc = new Encoder(32);
    enc.writeU16(PROTOCOL_VERSION);
    // optional<string> api_key
    if (this.opts.apiKey) {
      enc.writeU8(1); // present
      enc.writeString(this.opts.apiKey);
    } else {
      enc.writeU8(0); // absent
    }

    const frame = encodeFrame(OP_HANDSHAKE, 0, 0, enc.finish());
    this.sendRaw(frame);

    const resp = await this.waitForFrame(0, 10000);

    if (resp.opcode === OP_ERROR) {
      const dec = new Decoder(resp.payload);
      const errorCode = dec.readU8();
      const message = dec.readString();
      throw new Error(`handshake rejected: code=${errorCode} message=${message}`);
    }

    if (resp.opcode !== OP_HANDSHAKE_OK) {
      throw new Error(`unexpected handshake response opcode: 0x${resp.opcode.toString(16)}`);
    }

    const dec = new Decoder(resp.payload);
    dec.readU16(); // negotiated version
    this.nodeId = dec.readU64();
    const maxFrame = dec.readU32();
    if (maxFrame > 0) this.maxFrameSize = maxFrame;
  }

  /** Wait for a frame with a specific request ID. */
  private waitForFrame(requestId: number, timeoutMs: number): Promise<Frame> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`timeout waiting for response to request ${requestId}`));
      }, timeoutMs);

      this.pending.set(requestId, {
        resolve: (frame) => {
          clearTimeout(timer);
          resolve(frame);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
    });
  }

  /** Allocate the next request ID. Wraps at 2^32. */
  allocRequestId(): number {
    const id = this.nextRequestId;
    this.nextRequestId = ((this.nextRequestId + 1) & 0xffffffff) >>> 0;
    if (this.nextRequestId === 0) this.nextRequestId = 1;
    return id;
  }

  /**
   * Send a request frame and wait for the response.
   * The request ID is auto-assigned.
   */
  async sendRequest(opcode: number, payload: Buffer, timeoutMs = 30000): Promise<Frame> {
    if (this.closed) throw new Error("connection closed");
    const requestId = this.allocRequestId();
    const frame = encodeFrame(opcode, 0, requestId, payload);
    this.sendRaw(frame);
    return this.waitForFrame(requestId, timeoutMs);
  }

  /**
   * Send a request frame with a specific request ID and wait for the response.
   */
  async sendRequestWithId(opcode: number, requestId: number, payload: Buffer, timeoutMs = 30000): Promise<Frame> {
    if (this.closed) throw new Error("connection closed");
    const frame = encodeFrame(opcode, 0, requestId, payload);
    this.sendRaw(frame);
    return this.waitForFrame(requestId, timeoutMs);
  }

  /**
   * Register a handler for Delivery frames on the given consume request ID.
   * Returns the request ID used.
   */
  registerConsumeHandler(requestId: number, handler: (frame: Frame) => void): void {
    this.consumeHandlers.set(requestId, handler);
  }

  /** Unregister a consume handler. */
  unregisterConsumeHandler(requestId: number): void {
    this.consumeHandlers.delete(requestId);
  }

  /** Send a raw frame without expecting a response. */
  sendRaw(data: Buffer): void {
    if (this.closed || !this.socket) return;
    this.socket.write(data);
  }

  /** Send a fire-and-forget frame (e.g., CancelConsume, Disconnect). */
  sendFireAndForget(opcode: number, requestId: number, payload: Buffer): void {
    if (this.closed) return;
    this.sendRaw(encodeFrame(opcode, 0, requestId, payload));
  }

  private startPing(): void {
    const interval = this.opts.pingIntervalMs ?? 15000;
    if (interval <= 0) return;
    this.pingTimer = setInterval(() => {
      if (this.closed) return;
      const requestId = this.allocRequestId();
      this.sendRaw(encodeFrame(OP_PING, 0, requestId, Buffer.alloc(0)));
    }, interval);
    // Don't prevent process exit.
    if (this.pingTimer.unref) this.pingTimer.unref();
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /** Gracefully close the connection. */
  async close(): Promise<void> {
    if (this.closed) return;
    this.stopPing();
    try {
      this.sendRaw(encodeFrame(OP_DISCONNECT, 0, 0, Buffer.alloc(0)));
    } catch {
      // Ignore write errors on close.
    }
    this.closed = true;
    this.socket?.destroy();
    this.socket = null;
    // Reject all pending.
    const err = new Error("connection closed");
    for (const [, req] of this.pending) {
      req.reject(err);
    }
    this.pending.clear();
    for (const [, handler] of this.consumeHandlers) {
      handler({ opcode: 0, flags: 0, requestId: 0, payload: Buffer.alloc(0) });
    }
    this.consumeHandlers.clear();
  }

  get isClosed(): boolean {
    return this.closed;
  }
}

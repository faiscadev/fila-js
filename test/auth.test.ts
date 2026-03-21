import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as grpc from "@grpc/grpc-js";
import { Client } from "../src";
import { RPCError } from "../src/errors";
import {
  startTestServer,
  generateTestCerts,
  FILA_SERVER_AVAILABLE,
  type TestServer,
} from "./helpers";

describe.skipIf(!FILA_SERVER_AVAILABLE)("TLS + API key auth", () => {
  let server: TestServer;
  const BOOTSTRAP_KEY = "test-bootstrap-key-for-js-sdk";

  describe("API key authentication (no TLS)", () => {
    beforeAll(async () => {
      server = await startTestServer({
        extraConfig: `[auth]\nbootstrap_apikey = "${BOOTSTRAP_KEY}"`,
        adminApiKey: BOOTSTRAP_KEY,
      });
    });

    afterAll(() => {
      server?.stop();
    });

    it("enqueue succeeds with valid API key", async () => {
      await server.createQueue("auth-test-ok");
      const client = new Client(server.addr, { apiKey: BOOTSTRAP_KEY });
      try {
        const msgId = await client.enqueue(
          "auth-test-ok",
          null,
          Buffer.from("authenticated")
        );
        expect(msgId).toBeTruthy();
      } finally {
        client.close();
      }
    });

    it("enqueue fails without API key (unauthenticated)", async () => {
      await server.createQueue("auth-test-nokey");
      const client = new Client(server.addr);
      try {
        await expect(
          client.enqueue("auth-test-nokey", null, Buffer.from("fail"))
        ).rejects.toThrow(RPCError);
      } finally {
        client.close();
      }
    });

    it("enqueue fails with wrong API key", async () => {
      await server.createQueue("auth-test-badkey");
      const client = new Client(server.addr, { apiKey: "wrong-key" });
      try {
        await expect(
          client.enqueue("auth-test-badkey", null, Buffer.from("fail"))
        ).rejects.toThrow(RPCError);
      } finally {
        client.close();
      }
    });

    it("consume works with valid API key", async () => {
      await server.createQueue("auth-consume");
      const client = new Client(server.addr, { apiKey: BOOTSTRAP_KEY });
      try {
        await client.enqueue("auth-consume", null, Buffer.from("msg"));

        let received = false;
        for await (const msg of client.consume("auth-consume")) {
          expect(msg.payload.toString()).toBe("msg");
          await client.ack("auth-consume", msg.id);
          received = true;
          break;
        }
        expect(received).toBe(true);
      } finally {
        client.close();
      }
    });
  });

  describe("TLS (server-only)", () => {
    let certs: ReturnType<typeof generateTestCerts>;

    beforeAll(async () => {
      const certDir = fs.mkdtempSync("/tmp/fila-tls-test-");
      certs = generateTestCerts(certDir);

      // Write server certs to a temp dir, then reference from config.
      const serverCertPath = path.join(certDir, "server.pem");
      const serverKeyPath = path.join(certDir, "server.key");

      const adminCreds = grpc.credentials.createSsl(certs.caCert);

      server = await startTestServer({
        extraConfig: [
          `[tls]`,
          `cert_file = "${serverCertPath}"`,
          `key_file = "${serverKeyPath}"`,
        ].join("\n"),
        adminCreds,
      });
    });

    afterAll(() => {
      server?.stop();
    });

    it("connects with CA cert (server-TLS)", async () => {
      await server.createQueue("tls-test-ok");
      const client = new Client(server.addr, {
        caCert: certs.caCert,
      });
      try {
        const msgId = await client.enqueue(
          "tls-test-ok",
          null,
          Buffer.from("encrypted")
        );
        expect(msgId).toBeTruthy();
      } finally {
        client.close();
      }
    });

    it("fails without CA cert (insecure against TLS server)", async () => {
      await server.createQueue("tls-test-insecure");
      const client = new Client(server.addr);
      try {
        await expect(
          client.enqueue("tls-test-insecure", null, Buffer.from("fail"))
        ).rejects.toThrow();
      } finally {
        client.close();
      }
    });
  });

  describe("mTLS + API key", () => {
    let certs: ReturnType<typeof generateTestCerts>;

    beforeAll(async () => {
      const certDir = fs.mkdtempSync("/tmp/fila-mtls-test-");
      certs = generateTestCerts(certDir);

      const serverCertPath = path.join(certDir, "server.pem");
      const serverKeyPath = path.join(certDir, "server.key");
      const caCertPath = path.join(certDir, "ca.pem");

      const adminCreds = grpc.credentials.createSsl(
        certs.caCert,
        certs.clientKey,
        certs.clientCert
      );

      server = await startTestServer({
        extraConfig: [
          `[tls]`,
          `cert_file = "${serverCertPath}"`,
          `key_file = "${serverKeyPath}"`,
          `ca_file = "${caCertPath}"`,
          `[auth]`,
          `bootstrap_apikey = "${BOOTSTRAP_KEY}"`,
        ].join("\n"),
        adminCreds,
        adminApiKey: BOOTSTRAP_KEY,
      });
    });

    afterAll(() => {
      server?.stop();
    });

    it("enqueue succeeds with mTLS + API key", async () => {
      await server.createQueue("mtls-auth-ok");
      const client = new Client(server.addr, {
        caCert: certs.caCert,
        clientCert: certs.clientCert,
        clientKey: certs.clientKey,
        apiKey: BOOTSTRAP_KEY,
      });
      try {
        const msgId = await client.enqueue(
          "mtls-auth-ok",
          null,
          Buffer.from("secure")
        );
        expect(msgId).toBeTruthy();
      } finally {
        client.close();
      }
    });

    it("full flow: enqueue, consume, ack with mTLS + API key", async () => {
      await server.createQueue("mtls-full-flow");
      const client = new Client(server.addr, {
        caCert: certs.caCert,
        clientCert: certs.clientCert,
        clientKey: certs.clientKey,
        apiKey: BOOTSTRAP_KEY,
      });
      try {
        const msgId = await client.enqueue(
          "mtls-full-flow",
          { secure: "true" },
          Buffer.from("hello-mtls")
        );
        expect(msgId).toBeTruthy();

        let received = false;
        for await (const msg of client.consume("mtls-full-flow")) {
          expect(msg.id).toBe(msgId);
          expect(msg.payload.toString()).toBe("hello-mtls");
          expect(msg.headers).toEqual({ secure: "true" });
          await client.ack("mtls-full-flow", msg.id);
          received = true;
          break;
        }
        expect(received).toBe(true);
      } finally {
        client.close();
      }
    });
  });
});

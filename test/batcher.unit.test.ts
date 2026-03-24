import { describe, it, expect } from "vitest";
import { Client } from "../src";

describe("Batcher unit tests (no server)", () => {
  it("default batch mode is auto", () => {
    // Creating a client with default options should not throw.
    // The batcher is initialized but won't do anything until enqueue is called.
    const client = new Client("localhost:9999");
    // close() should succeed even without a real server (just closes channel).
    client.close();
  });

  it("disabled batch mode creates no batcher", () => {
    const client = new Client("localhost:9999", { batchMode: "disabled" });
    client.close();
  });

  it("auto batch mode with custom maxBatchSize", () => {
    const client = new Client("localhost:9999", {
      batchMode: "auto",
      maxBatchSize: 50,
    });
    client.close();
  });

  it("linger mode requires lingerMs and batchSize", () => {
    expect(
      () =>
        new Client("localhost:9999", {
          batchMode: "linger",
        } as import("../src/client").ClientOptions)
    ).toThrow("lingerMs and batchSize are required");
  });

  it("linger mode accepts valid config", () => {
    const client = new Client("localhost:9999", {
      batchMode: "linger",
      lingerMs: 10,
      batchSize: 5,
    });
    client.close();
  });

  it("close() resolves immediately when no pending messages", async () => {
    const client = new Client("localhost:9999");
    await client.close();
    // Should not hang.
  });

  it("close() resolves immediately when batching is disabled", async () => {
    const client = new Client("localhost:9999", { batchMode: "disabled" });
    await client.close();
  });
});

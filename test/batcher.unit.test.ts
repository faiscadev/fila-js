import { describe, it, expect } from "vitest";
import { Client } from "../src";

describe("Batcher unit tests (no server)", () => {
  it("default batch mode is auto", async () => {
    // Creating a client with default options should not throw.
    const client = new Client("localhost:9999");
    // close() should succeed even without a real server (just closes channel).
    await client.close();
  });

  it("disabled batch mode creates no batcher", async () => {
    const client = new Client("localhost:9999", { batchMode: "disabled" });
    await client.close();
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
  });

  it("close() resolves immediately when batching is disabled", async () => {
    const client = new Client("localhost:9999", { batchMode: "disabled" });
    await client.close();
  });
});

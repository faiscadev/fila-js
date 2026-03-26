import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30000,
    // Test files that start fila-server must not run concurrently — they pick
    // free ports via a TOCTOU probe and collide when multiple workers race.
    fileParallelism: false,
  },
});

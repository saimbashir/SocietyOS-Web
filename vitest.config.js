import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["backend/tests/**/*.test.js"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    env: {
      DATA_DIR: "memory",
      AUTH_MODE: "local",
      NODE_ENV: "test",
      DEMO_PASSWORD: "SocietyOS-Test-Only-2026",
    },
  },
});

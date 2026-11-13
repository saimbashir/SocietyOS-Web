import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./frontend/tests",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4001",
    headless: true,
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node backend/src/server.js",
    url: "http://127.0.0.1:4001/api/health",
    timeout: 60000,
    env: {
      PORT: "4001",
      APP_ORIGIN: "http://127.0.0.1:4001",
      DATA_DIR: "memory",
      AUTH_MODE: "local",
      NODE_ENV: "test",
      DEMO_PASSWORD: "SocietyOS-Test-Only-2026",
    },
    reuseExistingServer: false,
  },
});

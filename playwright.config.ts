import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_URL || "http://127.0.0.1:8084",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {},
  },
});

import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  use: {
    baseURL,
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    trace: "off",
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    },
  },
  webServer: {
    command: "npx next start --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
});

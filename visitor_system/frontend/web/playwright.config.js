// @ts-check
const path = require("path");
const { defineConfig, devices } = require("@playwright/test");

const smokePort = process.env.E2E_API_PORT || "8011";
const externalBaseUrl = process.env.E2E_API_BASE || "";
const baseURL = externalBaseUrl || `http://127.0.0.1:${smokePort}`;
const startBackendScript = path.join(__dirname, "scripts", "start-smoke-backend.ps1");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `powershell -NoProfile -ExecutionPolicy Bypass -File "${startBackendScript}" -Port ${smokePort}`,
        cwd: __dirname,
        url: `${baseURL}/health`,
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    {
      name: "edge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge",
      },
    },
  ],
});

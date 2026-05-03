import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "PC Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "iPhone 14",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "Pixel 7",
      use: { ...devices["Pixel 7"] },
    },
  ],
});

/*
 * §13 "Playwright for /receipt/:hash and /verify."
 *
 * These tests cover the two surfaces where a reader checks our work rather than reads it:
 * the receipt page, and the client-side verifier. They also assert the §18 rules that a
 * screenshot would show but a unit test cannot — that a non-discharge is rendered with the
 * same weight as a discharge, and that no state is signalled by colour.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env["E2E_PORT"] ?? 3319);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // §13 HB-5: a flaky test is fixed, never retried into silence. Retries stay at zero.
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: process.env["CI"] === undefined ? [["list"]] : [["list"], ["github"]],
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  /*
   * Runs against a PRODUCTION build, not `next dev`. Dev compiles each route on first
   * request, which on a cold cache exceeds any sane per-test timeout and makes the suite
   * measure the compiler rather than the page. It is also what a reader actually loads.
   */
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 420_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

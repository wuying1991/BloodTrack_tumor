import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for bloodtrack E2E.
 *
 * Target: the full Docker stack (frontend :3000 + nginx /api proxy -> backend :5000 + mongo).
 * The offline spec needs the production service worker, which only registers from the built
 * bundle served by nginx - so tests run against `docker compose up`, not the CRA dev server.
 *
 * Browser: Playwright chromium by default. If the chromium download is blocked (e.g. China
 * network), set E2E_BROWSER_CHANNEL=msedge to drive the system Edge instead (no download).
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const CHANNEL = process.env.E2E_BROWSER_CHANNEL; // e.g. 'msedge'

export default defineConfig({
  testDir: './tests',
  // Shared Docker stack + the offline spec mutates global SW cache state -> run serial.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ...(CHANNEL ? { channel: CHANNEL } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

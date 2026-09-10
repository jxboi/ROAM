import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
const isCI = !!process.env.CI;
// Escape hatch for sandboxes that ship a preinstalled Chromium under a
// different revision than this Playwright version downloads.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const browser = executablePath ? { channel: undefined, launchOptions: { executablePath } } : {};

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...browser } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...browser } },
  ],
  // The suite runs against the real build served with the production header
  // and rewrite rules, so a broken CSP or a 404 on a deep link fails here.
  webServer: {
    command: `npm run build && PORT=${port} npm run serve`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'pipe',
  },
});

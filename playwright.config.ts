import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
const isCI = !!process.env.CI;
// Escape hatch for sandboxes that ship a preinstalled Chromium under a
// different revision than this Playwright version downloads. Applies to the
// Chromium projects only; Firefox and WebKit are left to Playwright.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const chromium = executablePath ? { channel: undefined, launchOptions: { executablePath } } : {};

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // A broken engine should report quickly rather than retry its way through
  // the whole suite.
  maxFailures: isCI ? 15 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
  },
  // Chromium runs everything. The other engines run the journeys tagged
  // @smoke, which is where an engine difference would actually show up —
  // storage, downloads, dialogs, dates — without paying for the whole suite
  // five times over. WebKit carries the most weight of the three: this is a
  // mobile-first app, and iOS Safari is what its visitors are holding.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...chromium } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'], ...chromium } },
    { name: 'firefox', grep: /@smoke/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', grep: /@smoke/, use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mobile', grep: /@smoke/, use: { ...devices['iPhone 14'] } },
  ],
  // The suite runs against the real build served with the production header
  // and rewrite rules, so a broken CSP or a 404 on a deep link fails here.
  webServer: {
    // Building with the origin set exercises the sitemap and the absolute
    // canonical URLs, which are otherwise only reachable in a real deployment.
    command: `VITE_SITE_URL=${baseURL} npm run build && PORT=${port} npm run serve`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'pipe',
  },
});

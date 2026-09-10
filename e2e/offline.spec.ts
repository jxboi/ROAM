import { expect, test, type Page } from '@playwright/test';

// Playwright's WebKit build does not run service workers, so the behaviour is
// verified in the engines that can. Registration failure is caught in the app,
// which is what WebKit visitors get: the site, without the offline extra.
test.skip(({ browserName }) => browserName === 'webkit', 'no service worker in this engine');

async function installed(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 });
}

test.describe('offline', () => {
  test('takes control of the page it was served from', async ({ page }) => {
    await installed(page);
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(new URL(scope).pathname).toBe('/');
  });

  test('opens the app with no network at all', { tag: '@smoke' }, async ({ page, context }) => {
    await installed(page);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: /Life’s better/ })).toBeVisible();
    await expect(page.locator('article.ride-card').first()).toBeVisible();
  });

  test('opens a deep link and a lazily loaded route offline', async ({ page, context }) => {
    await installed(page);
    await context.setOffline(true);
    await page.goto('/ride/dolomites');
    await expect(page.getByRole('heading', { level: 1, name: 'The Dolomites' })).toBeVisible();
    await page.goto('/trips');
    await expect(page.getByRole('heading', { name: /Every adventure starts somewhere/ })).toBeVisible();
  });

  test('keeps a trip readable on the road', async ({ page, context }) => {
    await installed(page);
    await page.goto('/ride/dolomites');
    await page.getByRole('button', { name: 'Plan this ride' }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/);
    const url = page.url();

    await context.setOffline(true);
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1, name: 'My Dolomites ride' })).toBeVisible();
    await expect(page.locator('.planner-day').first()).toContainText('Bolzano');
  });

  test('still shows destination photography it has already loaded', async ({ page, context }) => {
    await installed(page);
    // Give the hero a chance to land in the runtime image cache.
    await page.waitForFunction(() => {
      const hero = document.querySelector<HTMLImageElement>('img.hero-image');
      return !!hero?.complete && hero.naturalWidth > 0;
    });
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('img.hero-image')).toBeVisible();
    const loaded = await page.evaluate(() => {
      const hero = document.querySelector<HTMLImageElement>('img.hero-image');
      return !!hero && hero.naturalWidth > 0;
    });
    expect(loaded).toBe(true);
  });

  test('leaves crawler files to the network rather than the app shell', async ({ page }) => {
    await installed(page);
    const robots = await page.evaluate(async () => {
      const response = await fetch('/robots.txt');
      return { status: response.status, body: await response.text() };
    });
    expect(robots.status).toBe(200);
    expect(robots.body).toContain('User-agent: *');
  });
});

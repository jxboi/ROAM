import { expect, test } from '@playwright/test';
import { navLink, shown } from './helpers';

const meta = (name: string) => `meta[name="${name}"]`;
const og = (property: string) => `meta[property="${property}"]`;

test.describe('routing and metadata', () => {
  test('serves a deep link directly from the server', { tag: '@smoke' }, async ({ page }) => {
    const response = await page.goto('/ride/lofoten');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: /Lofoten/ })).toBeVisible();
  });

  test('describes each route for search engines and link previews', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/ride/dolomites');
    await expect(page).toHaveTitle('The Dolomites · ROAM');
    await expect(page.locator(og('og:title'))).toHaveAttribute('content', 'The Dolomites · ROAM');
    await expect(page.locator(og('og:type'))).toHaveAttribute('content', 'article');
    await expect(page.locator(og('og:url'))).toHaveAttribute('content', /\/ride\/dolomites$/);
    await expect(page.locator(og('og:image'))).toHaveAttribute('content', /\/social\/dolomites\.jpg$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/ride\/dolomites$/);
    await expect(page.locator(meta('robots'))).toHaveAttribute('content', 'index, follow');

    const structured = await page.locator('script[data-roam="structured-data"]').textContent();
    expect(JSON.parse(structured ?? '{}')).toMatchObject({ '@type': 'TouristTrip', name: 'The Dolomites' });
  });

  test('serves the share card it advertises', async ({ page, request }) => {
    await page.goto('/ride/dolomites');
    const card = await page.locator(og('og:image')).getAttribute('content');
    const response = await request.get(card ?? '');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/jpeg');
  });

  test('keeps personal pages out of search results', async ({ page }) => {
    await page.goto('/trips');
    await expect(page.locator(meta('robots'))).toHaveAttribute('content', 'noindex, follow');
    await page.goto('/saved');
    await expect(page.locator(meta('robots'))).toHaveAttribute('content', 'noindex, follow');
  });

  test('canonicalises a filtered discovery URL back to the home page', async ({ page }) => {
    await page.goto('/?query=Italy&all=true');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/$/);
  });

  test('updates the title as the visitor moves between routes', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('ROAM — Find your next great ride');
    await navLink(page, /My trips/).click();
    await expect(page).toHaveTitle('My trips · ROAM');
    await navLink(page, /Saved/).click();
    await expect(page).toHaveTitle('Your saved rides · ROAM');
    // Exactly one of each tag, however many routes have been visited.
    await expect(page.locator(og('og:title'))).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });

  test('shows a friendly page for an unknown route', async ({ page }) => {
    await page.goto('/nowhere-in-particular');
    await expect(page.getByRole('heading', { name: /A little off the beaten path/ })).toBeVisible();
    await expect(page).toHaveTitle('Page not found · ROAM');
    await shown(page.getByRole('link', { name: /Explore the rides/ })).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('shows a friendly page for a ride that does not exist', async ({ page }) => {
    await page.goto('/ride/atlantis');
    await expect(page.getByRole('heading', { name: /This road isn’t on our map/ })).toBeVisible();
  });

  test('publishes a sitemap listing every ride', async ({ request, baseURL }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const sitemap = await response.text();
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    expect(urls).toContain(`${baseURL}/`);
    // Every ride the app can render is listed, and nothing private is.
    const rideUrls = urls.filter(url => url.includes('/ride/'));
    expect(rideUrls.length).toBe(8);
    expect(new Set(rideUrls).size).toBe(rideUrls.length);
    for (const url of urls) expect(url.startsWith(`${baseURL}/`)).toBe(true);
    expect(urls.some(url => /\/(saved|compare|trips)/.test(url))).toBe(false);

    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
  });

  test('every ride in the sitemap actually resolves', async ({ request, page }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    const rideUrls = [...sitemap.matchAll(/<loc>([^<]+\/ride\/[^<]+)<\/loc>/g)].map(match => match[1]);
    for (const url of rideUrls) {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', url);
    }
  });

  test('publishes robots.txt and the web app manifest', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('Disallow: /trips');

    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.status()).toBe(200);
    const parsed = await manifest.json();
    expect(parsed).toMatchObject({ name: expect.stringContaining('ROAM'), start_url: '/', display: 'standalone' });
  });

  test('sends the production security headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toContain("script-src 'self'");
  });

  test('loads every page without a console error or a failed request', { tag: '@smoke' }, async ({ page }) => {
    const problems: string[] = [];
    page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
    page.on('pageerror', error => problems.push(`page: ${error.message}`));
    page.on('response', response => {
      if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
    });
    for (const route of ['/', '/?all=true', '/ride/dolomites', '/saved', '/compare', '/trips', '/nowhere']) {
      await page.goto(route);
      await expect(page.locator('#main')).toBeVisible();
    }
    expect(problems).toEqual([]);
  });
});

test.describe('images', () => {
  test('sends a photo sized for the slot it lands in', async ({ browser, baseURL }) => {
    // A card is about 380px wide on a desktop grid; the 1280px original there
    // was most of the page weight.
    for (const [width, ratio, expected] of [[1280, 1, /-400\.webp$/], [1280, 2, /-800\.webp$/], [390, 2, /-800\.webp$/]] as const) {
      const context = await browser.newContext({ baseURL, viewport: { width, height: 800 }, deviceScaleFactor: ratio });
      const page = await context.newPage();
      await page.goto('/?all=true');
      const chosen = await page.locator('article.ride-card img').first().evaluate(
        (image: HTMLImageElement) => image.currentSrc,
      );
      expect(chosen, `${width}px at ${ratio}x`).toMatch(expected);
      await context.close();
    }
  });

  test('preloads the same hero file it goes on to render', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', request => {
      if (/\/images\/hero/.test(request.url())) requested.push(request.url().split('/').pop()!);
    });
    await page.goto('/');
    await expect(page.locator('img.hero-image')).toBeVisible();
    const rendered = await page.locator('img.hero-image').evaluate((image: HTMLImageElement) => image.currentSrc);
    // One hero file, fetched once: a preload that disagrees with the srcset
    // costs a second download of the largest image on the page.
    expect(new Set(requested).size).toBe(1);
    expect(rendered.endsWith(requested[0])).toBe(true);
  });
});

test.describe('printing', () => {
  test('prints a plan as a document, not as an app', async ({ page }) => {
    await page.goto('/ride/dolomites');
    await page.getByRole('button', { name: 'Plan this ride' }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/trips\//);

    await page.emulateMedia({ media: 'print' });
    // Navigation, the export button and the toast have no meaning on paper.
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.locator('.site-footer')).toBeHidden();
    await expect(page.locator('.mobile-nav')).toBeHidden();
    await expect(page.locator('.planner-tabs')).toBeHidden();
    // The plan itself does.
    await expect(page.getByRole('heading', { level: 1, name: 'My Dolomites ride' })).toBeVisible();
    await expect(page.locator('.planner-days')).toBeVisible();
    await expect(page.locator('.budget-summary')).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
  });
});

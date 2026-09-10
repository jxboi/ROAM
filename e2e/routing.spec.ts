import { expect, test } from '@playwright/test';
import { navLink, shown } from './helpers';

const meta = (name: string) => `meta[name="${name}"]`;
const og = (property: string) => `meta[property="${property}"]`;

test.describe('routing and metadata', () => {
  test('serves a deep link directly from the server', async ({ page }) => {
    const response = await page.goto('/ride/lofoten');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: /Lofoten/ })).toBeVisible();
  });

  test('describes each route for search engines and link previews', async ({ page }) => {
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

  test('loads every page without a console error or a failed request', async ({ page }) => {
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

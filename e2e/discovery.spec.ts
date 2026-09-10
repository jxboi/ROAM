import { expect, test } from '@playwright/test';
import { browseAllRides, goHome, rideCard, shown } from './helpers';

test.describe('discovery', () => {
  test('lands on the hero with a shortlist of rides', { tag: '@smoke' }, async ({ page }) => {
    await goHome(page);
    await expect(page.getByRole('heading', { name: /Life’s better/ })).toBeVisible();
    await expect(page).toHaveTitle('ROAM — Find your next great ride');
    // The landing page teases three rides before the full list.
    await expect(page.locator('article.ride-card')).toHaveCount(3);
    const hero = page.locator('img.hero-image');
    await expect(hero).toHaveAttribute('alt', /motorcyclist/i);
  });

  test('shows every ride once the visitor asks for the full list', async ({ page }) => {
    await goHome(page);
    await shown(page.getByRole('button', { name: /Explore the possibilities|View all destinations/ })).click();
    await expect(page.locator('article.ride-card')).toHaveCount(8);
    await expect(page).toHaveURL(/all=true/);
  });

  test('searches by destination and keeps the filter in a shareable URL', { tag: '@smoke' }, async ({ page }) => {
    await goHome(page);
    await page.getByLabel('Destination or region').fill('Italy');
    await page.getByRole('button', { name: 'Find my ride' }).click();
    await expect(page).toHaveURL(/query=Italy/);
    await expect(page.locator('article.ride-card')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'The Dolomites' })).toBeVisible();

    // The same URL, opened cold, must reproduce the same result.
    await page.goto(page.url());
    await expect(page.locator('article.ride-card')).toHaveCount(1);
    await expect(page.getByLabel('Destination or region')).toHaveValue('Italy');
  });

  test('offers a way out of an empty result set', async ({ page }) => {
    await page.goto('/?query=antarctica&all=true');
    await expect(page.getByRole('heading', { name: /A different road is waiting/ })).toBeVisible();
    await page.getByRole('button', { name: 'Show all rides' }).click();
    await expect(page.locator('article.ride-card')).toHaveCount(8);
  });

  test('combines month, style and budget filters', async ({ page }) => {
    await browseAllRides(page);
    const before = await page.locator('article.ride-card').count();
    await page.getByRole('button', { name: 'Mountain passes' }).click();
    await expect(page).toHaveURL(/style=Mountain\+passes/);
    const after = await page.locator('article.ride-card').count();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);

    await page.getByLabel('More filters').click();
    await page.getByRole('button', { name: 'Up to $200 / day' }).isVisible().catch(() => {});
    await page.getByLabel('Daily budget per rider').selectOption('200');
    await page.getByRole('button', { name: /^Show \d+ rides/ }).click();
    await expect(page.locator('.active-filters')).toContainText('Up to $200/day');
  });

  test('sorts results without losing the active filters', async ({ page }) => {
    await browseAllRides(page);
    await page.getByLabel('Sort rides').selectOption('budget');
    await expect(page).toHaveURL(/sort=budget/);
    const firstCard = page.locator('article.ride-card').first();
    await expect(firstCard).toContainText('Ha Giang');
  });

  test('clears every filter at once', async ({ page }) => {
    await page.goto('/?query=Italy&month=7&all=true');
    await expect(page.locator('.active-filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.locator('.active-filters')).toBeHidden();
    await expect(page.locator('article.ride-card')).toHaveCount(8);
  });

  test('opens a ride from its card', async ({ page }) => {
    await browseAllRides(page);
    await rideCard(page, 'The Dolomites').getByRole('link', { name: 'The Dolomites', exact: true }).click();
    await expect(page).toHaveURL(/\/ride\/dolomites$/);
    await expect(page.getByRole('heading', { level: 1, name: 'The Dolomites' })).toBeVisible();
  });
});

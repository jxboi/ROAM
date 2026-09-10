import { expect, test } from '@playwright/test';
import { browseAllRides, navLink, rideCard, shown, toast } from './helpers';

test.describe('saving and comparing', () => {
  test('saves a ride and keeps it across a reload', { tag: '@smoke' }, async ({ page }) => {
    await browseAllRides(page);
    const card = rideCard(page, 'The Dolomites');
    await card.getByRole('button', { name: 'Save The Dolomites' }).click();
    await expect(toast(page)).toContainText('Saved for the roads ahead');
    await expect(card.getByRole('button', { name: 'Unsave The Dolomites' })).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(rideCard(page, 'The Dolomites').getByRole('button', { name: 'Unsave The Dolomites' })).toBeVisible();

    await navLink(page, /Saved/).click();
    await expect(page).toHaveURL(/\/saved$/);
    await expect(page.locator('article.ride-card')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'The Dolomites' })).toBeVisible();
  });

  test('unsaving empties the collection again', async ({ page }) => {
    await browseAllRides(page);
    await rideCard(page, 'The Dolomites').getByRole('button', { name: 'Save The Dolomites' }).click();
    await page.goto('/saved');
    await page.getByRole('button', { name: 'Unsave The Dolomites' }).click();
    await expect(toast(page)).toContainText('Removed from saved rides');
    await expect(page.getByRole('heading', { name: /Some roads stay with you/ })).toBeVisible();
  });

  test('compares three rides and refuses a fourth', { tag: '@smoke' }, async ({ page }) => {
    await browseAllRides(page);
    await shown(page.getByRole('button', { name: 'Compare rides' })).click();
    const picks = page.getByRole('button', { name: 'Compare', exact: true });
    for (const index of [0, 1, 2]) await picks.nth(index).click();
    await expect(page.locator('.compare-tray')).toContainText('3 rides');

    await picks.nth(3).click();
    await expect(toast(page)).toContainText('Compare up to 3 rides');
    await expect(page.locator('.compare-tray')).toContainText('3 rides');

    await page.locator('.compare-tray').getByRole('link', { name: /Compare/ }).click();
    await expect(page).toHaveURL(/\/compare$/);
    await expect(page.locator('.comparison-table thead th')).toHaveCount(4);
    await expect(page.getByRole('row', { name: /Difficulty/ })).toBeVisible();
  });

  test('removing a ride from the comparison updates the table', async ({ page }) => {
    await browseAllRides(page);
    await shown(page.getByRole('button', { name: 'Compare rides' })).click();
    const picks = page.getByRole('button', { name: 'Compare', exact: true });
    await picks.nth(0).click();
    await picks.nth(1).click();
    await page.goto('/compare');
    await expect(page.locator('.comparison-table thead th')).toHaveCount(4);
    await page.locator('.comparison-table thead button').first().click();
    await expect(page.locator('.comparison-table thead th')).toHaveCount(3);
  });

  test('invites the visitor to pick rides when nothing is selected', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('heading', { name: /Which road is calling/ })).toBeVisible();
    await page.getByRole('link', { name: /Find rides to compare/ }).click();
    await expect(page).toHaveURL(/compare=true/);
  });

  test('starts with an empty trip list', async ({ page }) => {
    await page.goto('/trips');
    await expect(page.getByRole('heading', { name: /Every adventure starts somewhere/ })).toBeVisible();
  });
});

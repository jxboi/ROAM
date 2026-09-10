import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The shell renders desktop and mobile navigation, and the ride page renders
 * both plan buttons, with CSS deciding which is shown. Tests run at both sizes,
 * so always drive whichever control the viewport actually exposes.
 */
export const shown = (locator: Locator): Locator => locator.filter({ visible: true }).first();

export const navLink = (page: Page, name: RegExp | string): Locator =>
  shown(page.getByRole('link', { name }));

export async function goHome(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** Reveals the full result grid, which the landing page trims to three cards. */
export async function browseAllRides(page: Page) {
  await page.goto('/?all=true');
  await expect(page.locator('article.ride-card').first()).toBeVisible();
}

export const rideCard = (page: Page, name: string): Locator =>
  page.locator('article.ride-card').filter({ has: page.getByRole('heading', { name, exact: true }) });

export async function planRide(page: Page, rideId: string) {
  await page.goto(`/ride/${rideId}`);
  await shown(page.getByRole('button', { name: 'Plan this ride' })).click();
  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/);
}

export const toast = (page: Page): Locator => page.locator('.toast');

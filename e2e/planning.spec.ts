import { expect, test } from '@playwright/test';
import { planRide, shown, toast } from './helpers';

test.describe('planning a trip', () => {
  test('turns a ride into a plan that survives a reload', async ({ page }) => {
    await planRide(page, 'dolomites');
    await expect(page.getByRole('heading', { level: 1, name: 'My Dolomites ride' })).toBeVisible();
    await expect(page.locator('.autosave')).toContainText('Saved on this device');

    await page.getByLabel('Trip start date').fill('2027-07-10');
    await page.getByLabel('Number of riders').selectOption('2');
    const url = page.url();

    await page.reload();
    await expect(page).toHaveURL(url);
    await expect(page.getByLabel('Trip start date')).toHaveValue('2027-07-10');
    await expect(page.getByLabel('Number of riders')).toHaveValue('2');
    await expect(page.locator('.planner-day').first()).toContainText('Day 1 · 10 Jul');
  });

  test('prices the trip and reacts to bringing your own motorcycle', async ({ page }) => {
    await planRide(page, 'dolomites');
    const total = page.locator('.budget-summary h2');
    await expect(total).toHaveText('$1,370');

    await page.getByLabel('Motorcycle arrangement').selectOption('own');
    await expect(total).toHaveText('$809');
    await expect(page.locator('.budget-summary')).toContainText('$0');

    await page.getByLabel('Number of riders').selectOption('3');
    await expect(total).toHaveText('$2,426');
  });

  test('lets the rider edit the budget and restore the suggestion', async ({ page }) => {
    await planRide(page, 'dolomites');
    await page.getByRole('tab', { name: 'Budget' }).click();
    const food = page.getByLabel('Food & coffee cost in USD');
    await expect(food).toHaveValue('35');
    await food.fill('60');
    await expect(page.locator('.budget-summary h2')).toHaveText('$1,535');

    await page.getByRole('button', { name: 'Restore suggested costs' }).click();
    await expect(toast(page)).toContainText('Original budget estimates restored');
    await expect(food).toHaveValue('35');
    await expect(page.locator('.budget-summary h2')).toHaveText('$1,370');
  });

  test('adds and removes a rest day, and prices it correctly', async ({ page }) => {
    await planRide(page, 'dolomites');
    const days = page.locator('.planner-day');
    await expect(days).toHaveCount(6);

    await page.getByRole('button', { name: 'Add a rest day after day 1' }).click();
    await expect(toast(page)).toContainText('A little breathing room');
    await expect(days).toHaveCount(7);
    await expect(days.nth(1)).toContainText('A day off the bike');
    // A rest day adds a night and a day of rental, but no fuel.
    await expect(page.locator('.budget-summary h2')).toHaveText('$1,595');

    // Only the first day starts expanded.
    await days.nth(1).locator('summary').click();
    await days.nth(1).getByRole('button', { name: 'Remove rest day' }).click();
    await expect(days).toHaveCount(6);
    await expect(page.locator('.budget-summary h2')).toHaveText('$1,370');
  });

  test('keeps notes and the overnight stop per day', async ({ page }) => {
    await planRide(page, 'dolomites');
    await page.getByLabel('Day 1 overnight stop').fill('Castelrotto');
    await page.getByLabel('Day 1 notes').fill('Collect the bike at 09:00.');
    await page.reload();
    await expect(page.getByLabel('Day 1 overnight stop')).toHaveValue('Castelrotto');
    await expect(page.getByLabel('Day 1 notes')).toHaveValue('Collect the bike at 09:00.');
  });

  test('tracks the preparation checklist', async ({ page }) => {
    await planRide(page, 'dolomites');
    await page.getByRole('tab', { name: 'Get ready' }).click();
    await expect(page.locator('.checklist-score')).toContainText('0');
    for (const item of await page.locator('.checklist input[type="checkbox"]').all()) await item.check();
    await expect(page.getByRole('heading', { name: /You’ve made room for the adventure/ })).toBeVisible();

    await page.goto('/trips');
    await expect(page.locator('.trip-list-item')).toContainText('8 of 8 ready');
  });

  test('renames the trip', async ({ page }) => {
    await planRide(page, 'dolomites');
    await page.getByRole('button', { name: 'Rename trip' }).click();
    const field = page.getByLabel('Trip name');
    await field.fill('A week of mountain mornings');
    await page.getByRole('button', { name: /Save name/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'A week of mountain mornings' })).toBeVisible();
    await expect(page).toHaveTitle(/A week of mountain mornings/);
  });

  test('exports the plan as Markdown and the dates as a calendar', async ({ page }) => {
    await planRide(page, 'dolomites');
    await page.getByLabel('Trip start date').fill('2027-07-10');
    await shown(page.getByRole('button', { name: 'Export trip' })).click();

    const markdown = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download trip plan/ }).click();
    const markdownFile = await markdown;
    expect(markdownFile.suggestedFilename()).toBe('roam-dolomites-trip.md');

    const calendar = page.waitForEvent('download');
    await page.getByRole('button', { name: /Add to your calendar/ }).click();
    const calendarFile = await calendar;
    expect(calendarFile.suggestedFilename()).toBe('roam-dolomites.ics');
  });

  test('cannot export a calendar before there are dates', async ({ page }) => {
    await planRide(page, 'dolomites');
    await shown(page.getByRole('button', { name: 'Export trip' })).click();
    await expect(page.getByRole('button', { name: /Add to your calendar/ })).toBeDisabled();
    await expect(page.getByText('Set a start date to create calendar events')).toBeVisible();
  });

  test('warns when the dates fall outside the riding season', async ({ page }) => {
    await planRide(page, 'dolomites');
    await page.getByLabel('Trip start date').fill('2027-01-10');
    await expect(page.locator('.season-notice')).toContainText('outside our suggested riding months');
  });

  test('deletes a trip only after confirmation', async ({ page }) => {
    await planRide(page, 'dolomites');
    await page.getByRole('button', { name: 'Delete this trip' }).click();
    await page.getByRole('button', { name: 'Keep my trip' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'My Dolomites ride' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete this trip' }).click();
    await page.getByRole('button', { name: 'Delete trip' }).click();
    await expect(page).toHaveURL(/\/trips$/);
    await expect(page.getByRole('heading', { name: /Every adventure starts somewhere/ })).toBeVisible();
  });

  test('explains a trip link that this browser does not know', async ({ page }) => {
    await page.goto('/trips/00000000-0000-4000-8000-000000000000');
    await expect(page.getByRole('heading', { name: /Let’s find your next adventure/ })).toBeVisible();
    await page.getByRole('link', { name: /Go to my trips/ }).click();
    await expect(page).toHaveURL(/\/trips$/);
  });
});

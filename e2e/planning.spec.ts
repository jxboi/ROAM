import { expect, test } from '@playwright/test';
import { planRide, shown, toast } from './helpers';

test.describe('planning a trip', () => {
  test('turns a ride into a plan that survives a reload', { tag: '@smoke' }, async ({ page }) => {
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

  test('prices the trip and reacts to bringing your own motorcycle', { tag: '@smoke' }, async ({ page }) => {
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

  test('keeps notes and the overnight stop per day', { tag: '@smoke' }, async ({ page }) => {
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

  test('exports the plan as Markdown and the dates as a calendar', { tag: '@smoke' }, async ({ page }) => {
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

test('lists trips with the most recently edited first', async ({ page }) => {
  await planRide(page, 'dolomites');
  await planRide(page, 'lofoten');
  // Touch the older trip so it should move back to the top.
  await page.goto('/trips');
  await page.getByRole('link', { name: /Dolomites/ }).click();
  await page.getByLabel('Trip start date').fill('2027-08-01');
  await page.goto('/trips');
  await expect(page.locator('.trip-list-item').first()).toContainText('Dolomites');
});

test.describe('copying a plan', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'clipboard permissions are Chromium-only');

  test('puts the whole plan on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await planRide(page, 'dolomites');
    await shown(page.getByRole('button', { name: 'Export trip' })).click();
    await page.getByRole('button', { name: /Copy the whole plan/ }).click();
    await expect(toast(page)).toContainText('Trip plan copied');

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('My Dolomites ride');
    expect(copied).toContain('## Itinerary');
    expect(copied).toContain('Total estimate: $1,370');
  });

  test('says what to do instead when the clipboard is closed to it', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    // What an insecure context or a denied permission looks like from here.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        get: () => ({ writeText: () => Promise.reject(new Error('denied')) }),
      });
    });
    const page = await context.newPage();
    await planRide(page, 'dolomites');
    await shown(page.getByRole('button', { name: 'Export trip' })).click();
    await page.getByRole('button', { name: /Copy the whole plan/ }).click();
    await expect(toast(page)).toContainText('Copy isn’t available here');
    await context.close();
  });

  test('hands the link to the share sheet where there is one', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    await context.addInitScript(() => {
      const shared: unknown[] = [];
      Object.defineProperty(window, '__shared', { get: () => shared });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: unknown) => { shared.push(data); return Promise.resolve(); },
      });
    });
    const page = await context.newPage();
    await page.goto('/ride/dolomites');
    await shown(page.getByRole('button', { name: 'Share this ride' })).click();
    const shared = await page.evaluate(() => (window as unknown as { __shared: { url: string; title: string }[] }).__shared);
    expect(shared).toHaveLength(1);
    expect(shared[0].url).toContain('/ride/dolomites');
    expect(shared[0].title).toContain('The Dolomites');
    // Nothing to say: the sheet already told the visitor what happened.
    await page.waitForTimeout(300);
    await expect(toast(page)).toHaveText('');
    await context.close();
  });

  test('says nothing when the share sheet is dismissed', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
      });
    });
    const page = await context.newPage();
    await page.goto('/ride/dolomites');
    await shown(page.getByRole('button', { name: 'Share this ride' })).click();
    await page.waitForTimeout(300);
    await expect(toast(page)).toHaveText('');
    await context.close();
  });

  test('copies a ride link for sharing, and falls back gracefully', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/ride/dolomites');
    await shown(page.getByRole('button', { name: 'Share this ride' })).click();
    await expect(toast(page)).toContainText('Ride link copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('/ride/dolomites');
  });
});

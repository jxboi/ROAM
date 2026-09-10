import { expect, test } from '@playwright/test';
import { planRide, shown, toast } from './helpers';

const openProfile = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: 'Your travel space' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
};

test.describe('backup and restore', () => {
  test('carries a trip to a browser that has never seen it', { tag: '@smoke' }, async ({ page, browser, baseURL }) => {
    await planRide(page, 'dolomites');
    await page.getByRole('button', { name: 'Rename trip' }).click();
    await page.getByLabel('Trip name').fill('Backed-up ride');
    await page.getByRole('button', { name: /Save name/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Backed-up ride' })).toBeVisible();

    await openProfile(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download a backup/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^roam-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const backupPath = await file.path();

    // A separate context has none of this browser's storage: a new phone, or
    // the same one after its site data was cleared.
    const elsewhere = await browser.newContext({ baseURL });
    const fresh = await elsewhere.newPage();
    await fresh.goto('/trips');
    await expect(fresh.getByRole('heading', { name: /Every adventure starts somewhere/ })).toBeVisible();

    await openProfile(fresh);
    await fresh.getByRole('dialog').locator('input[type="file"]').setInputFiles(backupPath);
    await expect(toast(fresh)).toContainText('Restored 1 trip');
    await fresh.getByRole('button', { name: /Let’s explore/ }).click();

    await fresh.goto('/trips');
    await expect(fresh.getByRole('link', { name: /Backed-up ride/ })).toBeVisible();
    await fresh.reload();
    await expect(fresh.getByRole('link', { name: /Backed-up ride/ })).toBeVisible();
    await elsewhere.close();
  });

  test('says so plainly when the file is not a backup', async ({ page }) => {
    await page.goto('/');
    await openProfile(page);
    await page.getByRole('dialog').locator('input[type="file"]').setInputFiles({
      name: 'holiday-photos.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"not":"a backup"}'),
    });
    await expect(toast(page)).toContainText('doesn’t look like a ROAM backup');
  });

  test('adds a backup alongside plans already on the device', async ({ page }) => {
    await planRide(page, 'dolomites');
    await openProfile(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download a backup/ }).click();
    const backupPath = await (await download).path();
    await page.getByRole('button', { name: /Let’s explore/ }).click();

    // A second, different trip made after the backup was taken.
    await page.goto('/ride/lofoten');
    await shown(page.getByRole('button', { name: 'Plan this ride' })).click();
    await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/);

    await openProfile(page);
    await page.getByRole('dialog').locator('input[type="file"]').setInputFiles(backupPath);
    await expect(toast(page)).toContainText('already here');
    await page.getByRole('button', { name: /Let’s explore/ }).click();

    await page.goto('/trips');
    await expect(page.locator('.trip-list-item')).toHaveCount(2);
  });
});

test.describe('removing stored data', () => {
  test('clears the device only after confirming, and survives a reload', async ({ page }) => {
    await planRide(page, 'dolomites');
    await page.goto('/?all=true');
    await page.locator('article.ride-card').first().getByRole('button', { name: /^Save / }).click();

    await openProfile(page);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /Remove my saved data/ }).click();
    await expect(dialog.getByRole('group', { name: 'Confirm removing your saved data' }))
      .toContainText('Remove 1 trip and 1 saved ride');

    await dialog.getByRole('button', { name: 'Keep them' }).click();
    await dialog.getByRole('button', { name: /Let’s explore/ }).click();
    await page.goto('/trips');
    await expect(page.locator('.trip-list-item')).toHaveCount(1);

    await openProfile(page);
    await dialog.getByRole('button', { name: /Remove my saved data/ }).click();
    await dialog.getByRole('button', { name: 'Yes, remove them' }).click();
    await expect(toast(page)).toContainText('Your rides and trips have been removed');
    await dialog.getByRole('button', { name: /Let’s explore/ }).click();

    await page.reload();
    await expect(page.getByRole('heading', { name: /Every adventure starts somewhere/ })).toBeVisible();
    await page.goto('/saved');
    await expect(page.getByRole('heading', { name: /Some roads stay with you/ })).toBeVisible();
  });
});

test.describe('a browser that refuses to store anything', () => {
  test('still runs, says so, and keeps the session usable', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    // Private modes, lockdown settings and some in-app browsers make even
    // reading the property throw, not just writing to it.
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() { throw new DOMException('denied', 'SecurityError'); },
      });
    });
    const page = await context.newPage();

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Life’s better/ })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('couldn’t save these changes');

    // Planning still works for as long as the tab is open, and the planner is
    // honest about the fact that nothing is being written down.
    await page.goto('/ride/dolomites');
    await page.getByRole('button', { name: 'Plan this ride' }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/);
    await expect(page.locator('.autosave')).toContainText('Not saved — export a copy');
    await page.getByLabel('Trip start date').fill('2027-07-10');
    await expect(page.locator('.budget-summary h2')).toHaveText('$1,370');

    // And the way out is still open: the export is a file, not storage.
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export trip' }).filter({ visible: true }).first().click();
    await page.getByRole('button', { name: /Download trip plan/ }).click();
    expect((await download).suggestedFilename()).toBe('roam-dolomites-trip.md');
    await context.close();
  });
});

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

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { browseAllRides, planRide, shown } from './helpers';

async function expectNoViolations(page: Page) {
  // Contrast is measured from computed styles, so a dialog caught mid fade-in
  // reports false failures. Let any running animation settle first.
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    violations.map(v => `${v.id} (${v.impact}): ${v.nodes.map(n => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

test.describe('accessibility', () => {
  test('discovery, with and without filters', async ({ page }) => {
    await page.goto('/');
    await expectNoViolations(page);
    await browseAllRides(page);
    await expectNoViolations(page);
    await page.goto('/?query=antarctica&all=true');
    await expectNoViolations(page);
  });

  test('the filter dialog', async ({ page }) => {
    await browseAllRides(page);
    await page.getByLabel('More filters').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoViolations(page);
  });

  test('a ride, on each of its tabs', async ({ page }) => {
    await page.goto('/ride/dolomites');
    for (const tab of ['Overview', 'Itinerary', 'Good to know']) {
      await page.getByRole('tab', { name: tab }).click();
      await expectNoViolations(page);
    }
  });

  test('the collections, empty and filled', async ({ page }) => {
    for (const route of ['/saved', '/compare', '/trips']) {
      await page.goto(route);
      await expectNoViolations(page);
    }
    await browseAllRides(page);
    await shown(page.getByRole('button', { name: 'Compare rides' })).click();
    const picks = page.getByRole('button', { name: 'Compare', exact: true });
    await picks.nth(0).click();
    await picks.nth(1).click();
    await page.goto('/saved');
    await expectNoViolations(page);
    await page.goto('/compare');
    await expectNoViolations(page);
  });

  test('the planner, on each of its tabs', async ({ page }) => {
    await planRide(page, 'dolomites');
    for (const tab of ['Itinerary', 'Budget', 'Get ready']) {
      await page.getByRole('tab', { name: tab }).click();
      await expectNoViolations(page);
    }
    await shown(page.getByRole('button', { name: 'Export trip' })).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoViolations(page);
  });

  test('the not-found page', async ({ page }) => {
    await page.goto('/nowhere-in-particular');
    await expectNoViolations(page);
  });

  test('announces client-side navigation to assistive technology', async ({ page }) => {
    await page.goto('/');
    await page.goto('/saved');
    await shown(page.getByRole('link', { name: /Explore/ })).click();
    await expect(page.locator('#route-announcer')).toContainText('page loaded');
  });

  test('reaches the main content with the keyboard alone', async ({ page }) => {
    await page.goto('/');
    // The router marks its links once hydrated; before that a Tab goes nowhere.
    await page.locator('a[data-discover="true"]').first().waitFor();
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });
});

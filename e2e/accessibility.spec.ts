import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { browseAllRides, planRide, shown } from './helpers';

async function expectNoViolations(page: Page) {
  // Contrast is measured from computed styles, so a dialog caught mid fade-in
  // reports false failures. Let any running animation settle first.
  await page.evaluate(() => Promise.all((document.getAnimations?.() ?? []).map(a => a.finished.catch(() => {}))));
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
    .analyze();
  expect(
    violations.map(v => `${v.id} (${v.impact}): ${v.nodes.map(n => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

test.describe('accessibility', () => {
  test('discovery, with and without filters', { tag: '@smoke' }, async ({ page }) => {
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

  test('the planner, on each of its tabs', { tag: '@smoke' }, async ({ page }) => {
    await planRide(page, 'dolomites');
    for (const tab of ['Itinerary', 'Budget', 'Get ready']) {
      await page.getByRole('tab', { name: tab }).click();
      await expectNoViolations(page);
    }
    await shown(page.getByRole('button', { name: 'Export trip' })).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoViolations(page);
  });

  test('the profile panel, including the backup controls', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Your travel space' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoViolations(page);
  });

  test('the not-found page', async ({ page }) => {
    await page.goto('/nowhere-in-particular');
    await expectNoViolations(page);
  });

  test('announces client-side navigation to assistive technology', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#route-announcer')).toHaveText('');

    // Saved is a lazily loaded route, so the announcer must wait for it rather
    // than reading out the page being left.
    await shown(page.getByRole('link', { name: /Saved/ })).click();
    await expect(page.locator('#route-announcer')).toHaveText('Your saved rides, page loaded');

    await shown(page.getByRole('link', { name: /My trips/ })).click();
    await expect(page.locator('#route-announcer')).toHaveText('My trips, page loaded');
  });

  test.describe('in forced colours', () => {
    test.use({ forcedColors: 'active' });
    test.skip(({ browserName }) => browserName !== 'chromium', 'forced colours emulation');

    test('still distinguishes controls that normally rely on a background colour', async ({ page }) => {
      await page.goto('/?all=true');
      const widths = await page.evaluate(() => {
        const width = (selector: string) => {
          const el = document.querySelector(selector);
          return el ? parseFloat(getComputedStyle(el).borderTopWidth) : -1;
        };
        return {
          activeChip: width('.chip.active'),
          idleChip: width('.chip:not(.active)'),
          primaryButton: width('.button.primary'),
        };
      });
      // Selection and emphasis survive as borders, which forced colours keeps.
      expect(widths.idleChip).toBeGreaterThan(0);
      expect(widths.activeChip).toBeGreaterThan(widths.idleChip);
      expect(widths.primaryButton).toBeGreaterThan(0);
      await expectNoViolations(page);
    });

    test('keeps the planner readable', async ({ page }) => {
      await planRide(page, 'dolomites');
      await page.getByRole('tab', { name: 'Get ready' }).click();
      await expectNoViolations(page);
    });
  });

  test('moves between tab sets with the arrow, Home and End keys', async ({ page }) => {
    await page.goto('/ride/dolomites');
    const overview = page.getByRole('tab', { name: 'Overview' });
    await overview.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Itinerary' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Good to know' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(overview).toHaveAttribute('aria-selected', 'true');
    // Wrapping backwards from the first tab lands on the last.
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'Good to know' })).toHaveAttribute('aria-selected', 'true');
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

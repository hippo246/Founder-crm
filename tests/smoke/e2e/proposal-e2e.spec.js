import { test, expect } from '@playwright/test';

test.describe('Proposal → Project → Invoice E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('proposals tab loads', async ({ page }) => {
    await page.click('button:has-text("Proposals")');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Proposals')).toBeVisible();
  });

  test('proposal create button exists', async ({ page }) => {
    await page.click('button:has-text("Proposals")');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="proposal-create"]')).toBeVisible();
  });
});

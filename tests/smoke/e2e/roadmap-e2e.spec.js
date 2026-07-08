import { test, expect } from '@playwright/test';

test.describe('Roadmap → Task E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('roadmap tracker tab loads', async ({ page }) => {
    await page.click('button:has-text("Roadmap Tracker")');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Roadmap')).toBeVisible();
  });
});

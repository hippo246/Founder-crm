import { test, expect } from '@playwright/test';

test.describe('Support → Task/Log E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('support tickets tab loads', async ({ page }) => {
    await page.click('button:has-text("Support Tickets")');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Support Tickets')).toBeVisible();
  });
});

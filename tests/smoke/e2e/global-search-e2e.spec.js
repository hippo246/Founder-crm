import { test, expect } from '@playwright/test';

test.describe('Global Search E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('global search trigger exists', async ({ page }) => {
    await expect(page.locator('[data-testid="global-search-trigger"]')).toBeVisible();
  });
});

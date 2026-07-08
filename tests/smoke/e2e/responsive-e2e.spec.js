import { test, expect } from '@playwright/test';

test.describe('Responsive E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('desktop viewport loads', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);

    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('mobile menu button exists', async ({ page }) => {
    await expect(page.locator('[data-testid="mobile-menu-btn"]')).toBeVisible();
  });
});

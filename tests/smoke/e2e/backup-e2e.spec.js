import { test, expect } from '@playwright/test';

test.describe('Backup Export/Import E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('settings tab loads', async ({ page }) => {
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('backup export button exists', async ({ page }) => {
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="settings-export-backup"]')).toBeVisible();
  });
});

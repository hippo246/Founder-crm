import { test, expect } from '@playwright/test';

test.describe('Permission Blocking E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('role selector exists', async ({ page }) => {
    await expect(page.locator('[data-testid="role-selector"]')).toBeVisible();
  });

  test('can change role to Viewer', async ({ page }) => {
    await page.selectOption('[data-testid="role-selector"]', 'Viewer');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="role-selector"]')).toHaveValue('Viewer');
  });
});

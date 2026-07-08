import { test, expect } from '@playwright/test';

test.describe('Global Search', () => {
  test('global search trigger exists', async ({ page }) => {
    await page.goto('/');

    const searchTrigger = page.locator('button:has-text("Search everything")');
    await expect(searchTrigger).toBeVisible();
  });

  test('theme toggle exists', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('button:has-text("☀️"), button:has-text("🌙")');
    await expect(themeToggle).toBeVisible();
  });

  test('role selector exists in topbar', async ({ page }) => {
    await page.goto('/');

    const roleSelector = page.locator('select').filter({ hasText: /Owner|Admin|Staff|Viewer/ }).first();
    await expect(roleSelector).toBeVisible();
  });
});

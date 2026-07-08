import { test, expect } from '@playwright/test';

test.describe('Settings & Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Settings")');
  });

  test('settings tab loads', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /settings/i })).toBeVisible();
  });

  test('settings save button exists', async ({ page }) => {
    const saveBtn = page.locator('button:has-text("Save")').first();
    await expect(saveBtn).toBeVisible();
  });

  test('role selector exists', async ({ page }) => {
    const roleSelect = page.locator('select').filter({ hasText: /Owner|Admin|Staff|Viewer/ }).nth(1);
    await expect(roleSelect).toBeVisible();
  });

  test('backup export button exists', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export backup")');
    await expect(exportBtn).toBeVisible();
  });

  test('backup import button exists', async ({ page }) => {
    const importBtn = page.locator('button:has-text("Import backup")');
    await expect(importBtn).toBeVisible();
  });

  test('reset data button exists for Owner role', async ({ page }) => {
    const resetBtn = page.locator('button:has-text("Reset all demo data")');
    await expect(resetBtn).toBeVisible();
  });
});

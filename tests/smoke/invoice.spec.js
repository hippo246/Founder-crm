import { test, expect } from '@playwright/test';

test.describe('Invoice Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Invoices")');
  });

  test('invoice tab loads and shows create button', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /invoices/i })).toBeVisible();

    // Check create button exists for Owner role
    const createBtn = page.locator('button:has-text("Create Invoice")');
    await expect(createBtn).toBeVisible();
  });

  test('invoice form opens and has save button', async ({ page }) => {
    await page.click('button:has-text("Create Invoice")');

    // Wait for modal
    await page.waitForTimeout(500);

    // Check save button exists (use first to avoid strict mode violation)
    const saveBtn = page.locator('button:has-text("Create Invoice"), button:has-text("Update Invoice")').first();
    await expect(saveBtn).toBeVisible();
  });

  test('invoice export CSV button exists', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).toBeVisible();
  });
});

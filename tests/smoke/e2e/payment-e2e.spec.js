import { test, expect } from '@playwright/test';

test.describe('Payment + Invoice Status E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('invoices tab loads', async ({ page }) => {
    await page.click('button:has-text("Invoices")');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Invoices')).toBeVisible();
  });

  test('invoice create button exists', async ({ page }) => {
    await page.click('button:has-text("Invoices")');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="invoice-create"]')).toBeVisible();
  });
});

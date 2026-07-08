import { test, expect } from '@playwright/test';

test.describe('CSV Export E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('invoices export CSV button exists', async ({ page }) => {
    await page.click('button:has-text("Invoices")');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="invoice-export-csv"]')).toBeVisible();
  });

  test('proposals export CSV button exists', async ({ page }) => {
    await page.click('button:has-text("Proposals")');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="proposal-export-csv"]')).toBeVisible();
  });
});

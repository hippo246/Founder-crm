import { test, expect } from '@playwright/test';

test.describe('Invoice E2E Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('invoice tab loads and create button exists', async ({ page }) => {
    await page.click('button:has-text("Invoices")');
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=Invoices')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-create"]')).toBeVisible();
  });

  test('invoice form opens with required fields', async ({ page }) => {
    await page.click('button:has-text("Invoices")');
    await page.click('button:has-text("Create Invoice")');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="invoice-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-client-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-issue-date"]')).toBeVisible();
  });

  test('can fill invoice form fields', async ({ page }) => {
    await page.click('button:has-text("Invoices")');
    await page.click('button:has-text("Create Invoice")');
    await page.waitForTimeout(500);

    await page.fill('[data-testid="invoice-number"]', 'INV-TEST-001');
    await page.fill('[data-testid="invoice-title"]', 'Test Invoice');
    await page.fill('[data-testid="invoice-client-name"]', 'Test Client');
    await page.fill('[data-testid="invoice-issue-date"]', '2026-07-07');
    
    // Verify values were filled
    await expect(page.locator('[data-testid="invoice-number"]')).toHaveValue('INV-TEST-001');
    await expect(page.locator('[data-testid="invoice-title"]')).toHaveValue('Test Invoice');
  });

  test('line item inputs exist', async ({ page }) => {
    await page.click('button:has-text("Invoices")');
    await page.click('button:has-text("Create Invoice")');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="line-item-name-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="line-item-desc-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="line-item-qty-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="line-item-price-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-add-line-item"]')).toBeVisible();
  });

  test('export CSV button exists', async ({ page }) => {
    await page.click('button:has-text("Invoices")');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="invoice-export-csv"]')).toBeVisible();
  });
});

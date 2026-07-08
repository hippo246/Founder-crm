import { test, expect } from '@playwright/test';

test.describe('Object Text Regression Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('dashboard loads without broken object text', async ({ page }) => {
    const bodyText = await page.locator('body').textContent();
    
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('null');
    expect(bodyText).not.toContain('NaN');
  });

  test('invoices tab loads without broken object text', async ({ page }) => {
    await page.click('button:has-text("Invoices")');
    await page.waitForTimeout(500);

    const bodyText = await page.locator('body').textContent();
    
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('null');
    expect(bodyText).not.toContain('NaN');
  });
});

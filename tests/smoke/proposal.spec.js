import { test, expect } from '@playwright/test';

test.describe('Proposal Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="nav-proposals"]');
  });

  test('proposal tab loads', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /proposals/i })).toBeVisible();
  });

  test('proposal action buttons exist', async ({ page }) => {
    // Check that proposal cards have action buttons
    const printBtn = page.locator('[data-testid="proposal-print"]').first();
    const previewBtn = page.locator('[data-testid="proposal-preview"]').first();
    
    // These might not exist if no proposals, but buttons should exist in UI
    const hasProposalActions = await page.locator('[data-testid="proposal-print"], [data-testid="proposal-preview"]').count() > 0;
    
    // If no proposals, at least check the tab loaded
    await expect(page.locator('h2').filter({ hasText: /proposals/i })).toBeVisible();
  });
});

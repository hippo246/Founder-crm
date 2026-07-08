import { test, expect } from '@playwright/test';

test.describe('App Load & Navigation', () => {
  test('app loads with dashboard visible', async ({ page }) => {
    await page.goto('/');
    
    // Clear localStorage for fresh start
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Wait for app to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check dashboard heading exists
    const heading = page.locator('h2').filter({ hasText: /dashboard/i });
    await expect(heading).toBeVisible();
  });

  test('sidebar navigation works for all tabs', async ({ page }) => {
    await page.goto('/');

    const tabs = [
      { id: 'dashboard', text: 'Dashboard' },
      { id: 'contacts', text: 'Contacts' },
      { id: 'leads', text: 'Leads' },
      { id: 'projects', text: 'Projects' },
      { id: 'tasks', text: 'Tasks' },
      { id: 'followups', text: 'Follow-Ups' },
      { id: 'notes', text: 'Notes' },
      { id: 'documents', text: 'Documents' },
      { id: 'calendar', text: 'Calendar' },
      { id: 'communications', text: 'Comm Log' },
      { id: 'invoices', text: 'Invoices' },
      { id: 'payments', text: 'Payments' },
      { id: 'proposals', text: 'Proposals' },
      { id: 'prompts', text: 'Prompt History' },
      { id: 'logs', text: 'Project Logs' },
      { id: 'roadmap', text: 'Roadmap' },
      { id: 'whatsapp', text: 'WA Templates' },
      { id: 'analytics', text: 'Analytics' },
      { id: 'support', text: 'Support Tickets' },
      { id: 'tags', text: 'Tags & Fields' },
      { id: 'audit', text: 'Audit Logs' },
      { id: 'security', text: 'Security' },
      { id: 'settings', text: 'Settings' }
    ];

    for (const tab of tabs) {
      await page.click(`button:has-text("${tab.text}")`);
      await page.waitForTimeout(500); // Wait for tab transition

      // Check that some content is visible (heading or content)
      const hasContent = await page.locator('h2, h3').count() > 0;
      expect(hasContent).toBeTruthy();
    }
  });
});

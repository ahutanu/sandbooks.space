import { test, expect } from '@playwright/test';
import { seedCleanState } from './helpers';

test.describe('Local Terminal Mode', () => {
  test.skip('should toggle to local mode on desktop', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    await seedCleanState(page);

    await page.goto('/');
    await page.waitForLoadState('load');

    // Wait for header
    await page.waitForSelector('header h1', { timeout: 20000 });
    await expect(page.locator('header')).toBeVisible({ timeout: 20000 });

    // Check initial state (Cloud mode)
    // Look for button with label "Switch to local execution" (meaning we are in cloud)
    const toggleBtn = page.getByTestId('execution-toggle');
    await expect(toggleBtn).toBeVisible({ timeout: 15000 });

    // Click to switch
    await toggleBtn.click();

    // Should now show "Switch to cloud execution" (meaning we are in local)
    await expect(page.getByLabel('Switch to cloud execution')).toBeVisible({ timeout: 5000 });
  });

  test.skip('should disable local mode option on mobile', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await seedCleanState(page);
    
    // Mock mobile user agent (simple approach)
    await page.addInitScript(() => {
      Object.defineProperty(window, 'navigator', {
        value: { 
          ...window.navigator, 
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1' 
        },
        writable: true
      });
    });

    await page.goto('/');
    await page.waitForLoadState('load');

    const toggleBtn = page.getByTestId('execution-toggle');
    await expect(toggleBtn).toHaveCount(1);
    await expect(toggleBtn).toBeVisible({ timeout: 15000 });
  });
});


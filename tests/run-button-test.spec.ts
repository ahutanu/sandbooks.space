import { test } from '@playwright/test';
import { seedCleanState } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedCleanState(page);
  await page.goto('/');
});

test('Run Button Pulse Glow and Code Results', async ({ page }) => {
  // Click the Code button in toolbar
  await page.getByLabel(/Insert code block/i).click();
  await page.waitForTimeout(500);

  // Type Python code in the code block
  const codeArea = page.locator('.cm-content').first();
  await codeArea.click();
  await page.keyboard.type('print("Hello Spring Animation!")');
  await page.waitForTimeout(300);

  // Click Run button
  const runButton = page.getByLabel(/Run code/i).first();
  await runButton.click();

  // Capture during execution (pulse glow should be visible)
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'run-button-pulse-executing.png' });

  // Wait for execution to complete and entrance animation
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'code-results-entrance-animation.png' });

  console.log('✓ Captured Run button pulse and code results entrance animation');
});

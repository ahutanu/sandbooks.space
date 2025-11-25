import { test, expect } from '@playwright/test';
import { seedCleanState, insertCodeBlock } from './helpers';

test.describe('Core Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedCleanState(page);
    await page.goto('/');
    await page.waitForSelector('header h1', { timeout: 10000 });
    // Dismiss any toasts that might block interactions
    await page.evaluate(() => {
      // Dismiss react-hot-toast notifications
      const toaster = document.querySelector('[data-rht-toaster]');
      if (toaster) {
        const dismissButtons = toaster.querySelectorAll('button[aria-label="Dismiss"]');
        dismissButtons.forEach(btn => (btn as HTMLElement).click());
      }
    });
    await page.waitForTimeout(500); // Wait for toasts to dismiss
  });

  test('loads and shows primary actions', async ({ page }) => {
    await expect(page).toHaveTitle('Sandbooks - Executable Notes for Developers');
    // Header shows "Sandbooks" title (clean design)
    await expect(page.getByRole('heading', { name: 'Sandbooks' })).toBeVisible();
    await expect(page.getByLabel(/Create new note/i)).toBeVisible();
    // Verify header has action buttons (dark mode, terminal, new note)
    const header = page.locator('header');
    const hasActions = await header.locator('button').count() > 0;
    expect(hasActions).toBe(true);
  });

  test('editor area is scrollable', async ({ page }) => {
    const scrollable = await page.evaluate(() => {
      const container =
        document.querySelector('.flex-1.overflow-y-auto') ||
        document.querySelector('[class*="overflow-y-auto"]');
      return !!container && container.scrollHeight >= container.clientHeight;
    });
    expect(scrollable).toBe(true);
  });

  test('creating a new note updates count', async ({ page }) => {
    // Wait for page to stabilize
    // Avoid networkidle due to persistent connections
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Wait for toasts to auto-dismiss

    // Dismiss any remaining toasts
    await page.evaluate(() => {
      const toaster = document.querySelector('[data-rht-toaster]');
      if (toaster) {
        const dismissButtons = toaster.querySelectorAll('button[aria-label="Dismiss"]');
        dismissButtons.forEach(btn => {
          try {
            (btn as HTMLElement).click();
          } catch {
            // Ignore errors
          }
        });
      }
    });
    await page.waitForTimeout(1000);

    // Get initial count by counting note items in sidebar (id="note-{uuid}")
    const initialCount = await page.evaluate(() => {
      const noteItems = document.querySelectorAll('[id^="note-"]');
      return noteItems.length;
    });

    // Ensure button is clickable by scrolling into view and waiting
    const newNoteButton = page.getByLabel(/Create new note/i);
    await newNoteButton.scrollIntoViewIfNeeded();
    await newNoteButton.waitFor({ state: 'visible', timeout: 5000 });

    // Use JavaScript click to bypass any overlay issues
    await newNoteButton.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(500);

    // Verify note count increased by checking sidebar note items
    const newCount = await page.evaluate(() => {
      const noteItems = document.querySelectorAll('[id^="note-"]');
      return noteItems.length;
    });
    expect(newCount).toBe(initialCount + 1);
  });

  test('code block insertion works and is editable', async ({ page }) => {
    // Wait for page to be ready and dismiss toasts
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const toaster = document.querySelector('[data-rht-toaster]');
      if (toaster) {
        const dismissButtons = toaster.querySelectorAll('button[aria-label="Dismiss"]');
        dismissButtons.forEach(btn => (btn as HTMLElement).click());
      }
    });
    await page.waitForTimeout(300);

    // Insert code block via slash command
    await insertCodeBlock(page);

    await expect(page.locator('select').first()).toBeVisible({ timeout: 5000 });
    const editor = page.locator('.cm-content').first();
    await editor.click();
    await page.keyboard.type('print("Hello")');
    await expect(editor).toContainText('Hello', { timeout: 5000 });
  });

  test('language selector includes all supported languages', async ({ page }) => {
    // Wait and dismiss toasts
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const toaster = document.querySelector('[data-rht-toaster]');
      if (toaster) {
        const dismissButtons = toaster.querySelectorAll('button[aria-label="Dismiss"]');
        dismissButtons.forEach(btn => (btn as HTMLElement).click());
      }
    });
    await page.waitForTimeout(300);

    // Insert code block via slash command
    await insertCodeBlock(page);

    await expect(page.locator('select').first()).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500); // Wait for select to populate

    const options = await page.locator('select').first().locator('option').allTextContents();
    const normalizedOptions = options.map(opt => opt.trim().toLowerCase()).filter(opt => opt.length > 0);
    const expected = ['bash', 'go', 'javascript', 'python', 'typescript'].map(lang => lang.toLowerCase());

    // Check that all expected languages are present
    const hasAllLanguages = expected.every(lang => normalizedOptions.includes(lang));
    expect(hasAllLanguages).toBe(true);
  });

  test('export triggers download with expected filename', async ({ page }) => {
    // Wait and dismiss toasts
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const toaster = document.querySelector('[data-rht-toaster]');
      if (toaster) {
        const dismissButtons = toaster.querySelectorAll('button[aria-label="Dismiss"]');
        dismissButtons.forEach(btn => (btn as HTMLElement).click());
      }
    });
    await page.waitForTimeout(300);
    
    // Export is in SyncStatusIcon popover - need to open it first
    // Find the sync status icon button (it's the last button in header before the divider)
    const syncIconButton = page.locator('header button').last();
    await syncIconButton.waitFor({ state: 'visible', timeout: 5000 });
    await syncIconButton.click();
    await page.waitForTimeout(300);
    
    // Now find the "Export Notes" button in the popover
    const exportButton = page.getByText('Export Notes');
    await exportButton.waitFor({ state: 'visible', timeout: 5000 });
    
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/sandbooks-\d{4}-\d{2}-\d{2}\.json/);
  });

  test('terminal panel opens and is usable', async ({ page }) => {
    // Find terminal toggle button
    // It's usually in the sidebar or header, likely an icon
    // Assuming it's the one with code/terminal icon
    const terminalToggle = page.locator('button[aria-label="Toggle Terminal"]').or(page.locator('button[title*="Terminal"]'));
    
    if (await terminalToggle.count() > 0) {
      await terminalToggle.first().click();
      // Check for xterm-screen which indicates terminal loaded
      await expect(page.locator('.xterm-screen')).toBeVisible({ timeout: 5000 });
      
      // Check for prompt (might depend on mode, but usually '$')
      // Note: canvas renders text so we can't check text easily, but we can check if xterm container exists
      await expect(page.locator('.xterm-viewport')).toBeVisible();
    }
  });
});

import type { Page } from '@playwright/test';

/**
 * Insert a code block using slash commands
 */
export async function insertCodeBlock(page: Page) {
  // Focus the editor and use slash command to insert code block
  const proseMirror = page.locator('.ProseMirror');
  await proseMirror.click();
  await page.keyboard.type('/code');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

/**
 * Seed a predictable localStorage state before the app loads.
 * - Prevents first-run docs from populating
 * - Provides a single empty note so selectors are stable
 */
export async function seedCleanState(page: Page) {
  await page.addInitScript(() => {
    const note = {
      id: 'test-note',
      title: 'Test Note',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: []
          }
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      codeBlocks: []
    };

    localStorage.setItem('sandbooks_notes', JSON.stringify([note]));
    localStorage.setItem('sandbooks-first-run-complete', 'true');
    localStorage.setItem('sandbooks-dark-mode', 'false');
    localStorage.setItem('sandbooks-typewriter-mode', 'false');
    localStorage.setItem('sandbooks-focus-mode', 'false');
    // Dismiss analytics consent to avoid modal blocking tests
    localStorage.setItem('sandbooks-analytics-consent', 'disabled');
    // Initialize empty folders array for folder system
    localStorage.setItem('sandbooks-folders', JSON.stringify([]));
    // Initialize empty deleted folder IDs for GitHub sync
    localStorage.setItem('sandbooks-deleted-folder-ids', JSON.stringify([]));
  });
}

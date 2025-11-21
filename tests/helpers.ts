import type { Page } from '@playwright/test';

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
  });
}

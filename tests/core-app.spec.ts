import { test, expect } from '@playwright/test';
import { seedCleanState } from './helpers';

test.describe('Core Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedCleanState(page);
    await page.goto('/');
    await page.waitForSelector('header h1', { timeout: 10000 });
  });

  test('loads and shows primary actions', async ({ page }) => {
    await expect(page).toHaveTitle('Sandbooks - Executable Notes for Developers');
    await expect(page.getByText('dev notes')).toBeVisible();
    await expect(page.getByTitle(/cloud execution/i)).toBeVisible();
    await expect(page.getByTitle(/new note/i)).toBeVisible();
    await expect(page.getByTitle(/export/i)).toBeVisible();
    await expect(page.getByTitle(/import/i)).toBeVisible();
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

  test('cloud execution toggle updates state', async ({ page }) => {
    const cloudToggle = page.getByTitle(/cloud execution/i);
    await cloudToggle.click();
    await expect(cloudToggle).toHaveAttribute('title', /cloud execution disabled/i);
  });

  test('creating a new note updates count', async ({ page }) => {
    const countText = await page.locator('text=/\\d+ notes?/').textContent();
    const initialCount = parseInt(countText?.match(/\d+/)?.[0] || '0');
    await page.getByTitle(/new note/i).click();
    await expect(page.locator(`text=${initialCount + 1} note`)).toBeVisible();
  });

  test('code block insertion works and is editable', async ({ page }) => {
    await page.getByLabel(/Insert code block/i).click();
    await expect(page.locator('select').first()).toBeVisible();
    const editor = page.locator('.cm-content').first();
    await editor.click();
    await page.keyboard.type('print("Hello")');
    await expect(editor).toContainText('Hello');
  });

  test('language selector includes all supported languages', async ({ page }) => {
    await page.getByLabel(/Insert code block/i).click();
    const options = await page.locator('select').first().locator('option').allTextContents();
    expect(options.sort()).toEqual(['bash', 'go', 'javascript', 'python', 'typescript'].sort());
  });

  test('export triggers download with expected filename', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByTitle(/export/i).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/sandbooks-\d{4}-\d{2}-\d{2}\.json/);
  });
});

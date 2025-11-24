import { test, expect } from '@playwright/test';
import { seedCleanState } from './helpers';

/**
 * Code Editor Focus Tests
 *
 * These tests ensure the code editor maintains focus during typing
 * and prevents the critical defocus bug where the editor loses focus
 * after each keystroke.
 *
 * Bug Context:
 * - CodeMirrorEditor was reinitializing on every keystroke due to
 *   props in the dependency array of the initialization useEffect
 * - This caused the editor to be destroyed and recreated, losing focus
 * - Users could not type more than one character at a time
 */

test.describe('Code Editor Focus and Typing', () => {
  test.beforeEach(async ({ page }) => {
    await seedCleanState(page);
    await page.goto('/');
    await page.waitForSelector('header h1', { timeout: 10000 });

    // Dismiss any toasts
    await page.evaluate(() => {
      const toaster = document.querySelector('[data-rht-toaster]');
      if (toaster) {
        const dismissButtons = toaster.querySelectorAll('button[aria-label="Dismiss"]');
        dismissButtons.forEach(btn => (btn as HTMLElement).click());
      }
    });
    await page.waitForTimeout(500);
  });

  test('code editor maintains focus during continuous typing', async ({ page }) => {
    // Insert code block
    const codeBlockButton = page.getByLabel(/Insert code block/i).or(page.getByTitle(/Insert Code Block/i));
    await codeBlockButton.waitFor({ state: 'visible', timeout: 5000 });
    await codeBlockButton.click({ force: true });

    // Wait for code editor to appear
    const editor = page.locator('.cm-content').first();
    await editor.waitFor({ state: 'visible', timeout: 5000 });
    await editor.click();

    // Type characters one by one to test focus retention
    const testString = 'print("test")';
    for (const char of testString) {
      await page.keyboard.type(char);
      await page.waitForTimeout(50); // Small delay between keystrokes

      // Verify editor still has focus after each keystroke
      const isFocused = await editor.evaluate((el) => {
        const activeElement = document.activeElement;
        return el.contains(activeElement);
      });

      expect(isFocused).toBe(true);
    }

    // Verify the complete text was typed
    await expect(editor).toContainText('print("test")', { timeout: 5000 });
  });

  test('code editor handles rapid typing without losing focus', async ({ page }) => {
    // Insert code block
    const codeBlockButton = page.getByLabel(/Insert code block/i).or(page.getByTitle(/Insert Code Block/i));
    await codeBlockButton.waitFor({ state: 'visible', timeout: 5000 });
    await codeBlockButton.click({ force: true });

    // Wait for code editor
    const editor = page.locator('.cm-content').first();
    await editor.waitFor({ state: 'visible', timeout: 5000 });
    await editor.click();

    // Type rapidly (simulating fast typing)
    const testCode = 'def hello():\n    return "world"';
    await page.keyboard.type(testCode, { delay: 20 }); // 20ms delay = fast typing

    // Verify the code was typed correctly
    await expect(editor).toContainText('def hello()', { timeout: 5000 });
    await expect(editor).toContainText('return "world"', { timeout: 5000 });
  });

  test('code editor allows editing existing code without defocus', async ({ page }) => {
    // Insert code block
    const codeBlockButton = page.getByLabel(/Insert code block/i).or(page.getByTitle(/Insert Code Block/i));
    await codeBlockButton.waitFor({ state: 'visible', timeout: 5000 });
    await codeBlockButton.click({ force: true });

    const editor = page.locator('.cm-content').first();
    await editor.waitFor({ state: 'visible', timeout: 5000 });
    await editor.click();

    // Type initial code
    await page.keyboard.type('print("hello")');
    await expect(editor).toContainText('hello', { timeout: 5000 });

    // Edit the code (simulate going back and changing text)
    await page.keyboard.press('Home'); // Go to start
    await page.keyboard.press('ArrowRight'); // Move to 'p'
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight'); // After 'print('

    // Type additional characters
    await page.keyboard.type('Hello ');

    // Verify editor still has focus
    const isFocused = await editor.evaluate((el) => {
      const activeElement = document.activeElement;
      return el.contains(activeElement);
    });
    expect(isFocused).toBe(true);
  });

  test('code editor maintains focus when switching languages', async ({ page }) => {
    // Insert code block
    const codeBlockButton = page.getByLabel(/Insert code block/i).or(page.getByTitle(/Insert Code Block/i));
    await codeBlockButton.waitFor({ state: 'visible', timeout: 5000 });
    await codeBlockButton.click({ force: true });

    const editor = page.locator('.cm-content').first();
    await editor.waitFor({ state: 'visible', timeout: 5000 });
    await editor.click();

    // Type some code
    await page.keyboard.type('print("test")');
    await expect(editor).toContainText('test', { timeout: 5000 });

    // Change language
    const languageSelector = page.locator('select').first();
    await languageSelector.selectOption('javascript');
    await page.waitForTimeout(300);

    // Click back in editor and type more
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type('\nconsole.log("js")');

    // Verify both texts are present
    await expect(editor).toContainText('test', { timeout: 5000 });
    await expect(editor).toContainText('console.log', { timeout: 5000 });
  });

  test('multiple code blocks can be edited independently', async ({ page }) => {
    // Insert first code block
    const codeBlockButton = page.getByLabel(/Insert code block/i).or(page.getByTitle(/Insert Code Block/i));
    await codeBlockButton.waitFor({ state: 'visible', timeout: 5000 });
    await codeBlockButton.click({ force: true });

    const firstEditor = page.locator('.cm-content').first();
    await firstEditor.waitFor({ state: 'visible', timeout: 5000 });
    await firstEditor.click();
    await page.keyboard.type('first block');

    // Insert second code block
    await page.keyboard.press('Escape'); // Exit code block
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await codeBlockButton.click({ force: true });

    const secondEditor = page.locator('.cm-content').nth(1);
    await secondEditor.waitFor({ state: 'visible', timeout: 5000 });
    await secondEditor.click();
    await page.keyboard.type('second block');

    // Verify both blocks have correct content
    await expect(firstEditor).toContainText('first block', { timeout: 5000 });
    await expect(secondEditor).toContainText('second block', { timeout: 5000 });
  });

  test('code editor handles special characters without losing focus', async ({ page }) => {
    // Insert code block
    const codeBlockButton = page.getByLabel(/Insert code block/i).or(page.getByTitle(/Insert Code Block/i));
    await codeBlockButton.waitFor({ state: 'visible', timeout: 5000 });
    await codeBlockButton.click({ force: true });

    const editor = page.locator('.cm-content').first();
    await editor.waitFor({ state: 'visible', timeout: 5000 });
    await editor.click();

    // Type special characters one by one
    const specialChars = '{}[]()@#$%^&*';
    for (const char of specialChars) {
      await page.keyboard.type(char);
      await page.waitForTimeout(30);
    }

    // Verify all characters were typed
    await expect(editor).toContainText(specialChars, { timeout: 5000 });
  });

  test('code editor preserves content after losing and regaining focus', async ({ page }) => {
    // Insert code block
    const codeBlockButton = page.getByLabel(/Insert code block/i).or(page.getByTitle(/Insert Code Block/i));
    await codeBlockButton.waitFor({ state: 'visible', timeout: 5000 });
    await codeBlockButton.click({ force: true });

    const editor = page.locator('.cm-content').first();
    await editor.waitFor({ state: 'visible', timeout: 5000 });
    await editor.click();

    // Type initial code
    await page.keyboard.type('print("preserved")');
    await expect(editor).toContainText('preserved', { timeout: 5000 });

    // Click outside to lose focus
    await page.locator('.ProseMirror').click();
    await page.waitForTimeout(300);

    // Click back into editor
    await editor.click();

    // Verify content is still there
    await expect(editor).toContainText('preserved', { timeout: 5000 });

    // Type more to verify editor still works
    await page.keyboard.press('End');
    await page.keyboard.type('\nprint("still works")');
    await expect(editor).toContainText('still works', { timeout: 5000 });
  });
});

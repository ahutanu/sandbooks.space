import { test, expect } from '@playwright/test';
import { seedCleanState } from './helpers';

// Helper selector for folders with data-folder-id
const folderSelector = '[role="treeitem"][data-folder-id]';

test.describe('Folder System', () => {
  test.beforeEach(async ({ page }) => {
    await seedCleanState(page);
    await page.goto('/');
    await page.waitForSelector('header h1', { timeout: 10000 });
    // Wait for the folder tree to render
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
  });

  test.describe('Folder Tree UI', () => {
    test('displays folder tree with All Notes', async ({ page }) => {
      const folderTree = page.locator('[role="tree"][aria-label="Folder tree"]');
      await expect(folderTree).toBeVisible();

      // All Notes treeitem
      const allNotes = folderTree.locator('[role="treeitem"]').filter({ hasText: 'All Notes' });
      await expect(allNotes).toBeVisible();
    });

    test('folder header shows correct controls', async ({ page }) => {
      // The header shows "FOLDERS" (uppercase via CSS)
      const foldersHeader = page.locator('text=Folders').or(page.locator('text=FOLDERS'));
      await expect(foldersHeader.first()).toBeVisible();

      // Check for view toggle button
      const viewToggle = page.locator('[aria-label="Switch to flat view"]').or(
        page.locator('[aria-label="Switch to tree view"]')
      );
      await expect(viewToggle).toBeVisible();

      // Create folder button in header
      const createFolderButton = page.locator('button[aria-label="Create folder"]').first();
      await expect(createFolderButton).toBeVisible();
    });

    test('All Notes shows note count', async ({ page }) => {
      // Find the All Notes row and check it has a count badge
      const folderTree = page.locator('[role="tree"]');
      const allNotesRow = folderTree.locator('[role="treeitem"]').filter({ hasText: 'All Notes' });
      await expect(allNotesRow).toBeVisible();

      // There should be a count displayed (may be 0 or more)
      const countBadge = allNotesRow.locator('span').filter({ hasText: /^\d+$/ });
      await expect(countBadge).toBeVisible();
    });
  });

  test.describe('Folder Creation', () => {
    test('create folder button shows inline input', async ({ page }) => {
      // Click create folder button in header
      const createFolderButton = page.locator('button[aria-label="Create folder"]').first();
      await createFolderButton.click();

      // Check for folder name input
      const folderInput = page.locator('input[aria-label="Folder name"]');
      await expect(folderInput).toBeVisible();
    });

    test('can create a new folder', async ({ page }) => {
      // Click create folder button
      const createFolderButton = page.locator('button[aria-label="Create folder"]').first();
      await createFolderButton.click();

      // Find and fill the input
      const folderInput = page.locator('input[aria-label="Folder name"]');
      await expect(folderInput).toBeVisible();
      await folderInput.fill('Test Folder E2E');

      // Press Enter to submit
      await page.keyboard.press('Enter');

      // Wait for real folder to appear (exclude virtual folders)
      const newFolder = page.locator(folderSelector).filter({ hasText: 'Test Folder E2E' });
      await expect(newFolder).toBeVisible({ timeout: 5000 });
    });

    test('can cancel folder creation with Escape', async ({ page }) => {
      const createFolderButton = page.locator('button[aria-label="Create folder"]').first();
      await createFolderButton.click();

      const folderInput = page.locator('input[aria-label="Folder name"]');
      await expect(folderInput).toBeVisible();
      await folderInput.fill('Should Not Exist');

      // Press Escape to cancel
      await page.keyboard.press('Escape');

      // Input should disappear
      await expect(folderInput).not.toBeVisible();

      // Real folder should not exist (virtual folder from orphan tag is ok)
      const folder = page.locator(folderSelector).filter({ hasText: 'Should Not Exist' });
      await expect(folder).toHaveCount(0);
    });
  });

  test.describe('Folder Context Menu', () => {
    test('right-click on folder shows context menu', async ({ page }) => {
      // First create a folder
      const createFolderButton = page.locator('button[aria-label="Create folder"]').first();
      await createFolderButton.click();

      const folderInput = page.locator('input[aria-label="Folder name"]');
      await folderInput.fill('Context Menu Test');
      await page.keyboard.press('Enter');

      // Wait for real folder to appear
      const folder = page.locator(folderSelector).filter({ hasText: 'Context Menu Test' });
      await expect(folder).toBeVisible({ timeout: 5000 });

      // Right-click to open context menu
      await folder.click({ button: 'right' });

      // Verify context menu appears with options
      const contextMenu = page.locator('[role="menu"]');
      await expect(contextMenu).toBeVisible();

      await expect(page.locator('[role="menuitem"]').filter({ hasText: /Subfolder/i })).toBeVisible();
      await expect(page.locator('[role="menuitem"]').filter({ hasText: /Rename/i })).toBeVisible();
      await expect(page.locator('[role="menuitem"]').filter({ hasText: /Delete/i })).toBeVisible();
    });

    test('can rename folder via context menu', async ({ page }) => {
      // Create a folder
      const createFolderButton = page.locator('button[aria-label="Create folder"]').first();
      await createFolderButton.click();

      const folderInput = page.locator('input[aria-label="Folder name"]');
      await folderInput.fill('Rename Test');
      await page.keyboard.press('Enter');

      // Wait for real folder to appear
      const folder = page.locator(folderSelector).filter({ hasText: 'Rename Test' });
      await expect(folder).toBeVisible({ timeout: 5000 });

      // Right-click and select Rename
      await folder.click({ button: 'right' });

      const renameMenuItem = page.locator('[role="menuitem"]').filter({ hasText: /Rename/i });
      await renameMenuItem.click();

      // Enter new name in the rename input
      const renameInput = page.locator('input[aria-label="Folder name"]');
      await expect(renameInput).toBeVisible();
      await renameInput.fill('Renamed Folder');
      await page.keyboard.press('Enter');

      // Verify renamed folder (real folder)
      const renamedFolder = page.locator(folderSelector).filter({ hasText: 'Renamed Folder' });
      await expect(renamedFolder).toBeVisible({ timeout: 5000 });
    });

    test('can delete folder via context menu', async ({ page }) => {
      // Create a folder
      const createFolderButton = page.locator('button[aria-label="Create folder"]').first();
      await createFolderButton.click();

      const folderInput = page.locator('input[aria-label="Folder name"]');
      await folderInput.fill('Delete Test Folder');
      await page.keyboard.press('Enter');

      // Wait for real folder to appear
      const folder = page.locator(folderSelector).filter({ hasText: 'Delete Test Folder' });
      await expect(folder).toBeVisible({ timeout: 5000 });

      // Right-click and select Delete
      await folder.click({ button: 'right' });

      const deleteMenuItem = page.locator('[role="menuitem"]').filter({ hasText: /Delete/i });
      await deleteMenuItem.click();

      // Confirm deletion dialog
      const confirmDialog = page.locator('[role="dialog"]').filter({ hasText: /Delete folder/i });
      await expect(confirmDialog).toBeVisible();

      const confirmDeleteButton = page.locator('[role="dialog"]').locator('button').filter({ hasText: /^Delete$/i });
      await confirmDeleteButton.click();

      // Verify folder is removed
      await expect(folder).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Nested Folders', () => {
    test('can create subfolder via context menu', async ({ page }) => {
      // Create parent folder
      const createFolderButton = page.locator('button[aria-label="Create folder"]').first();
      await createFolderButton.click();

      const folderInput = page.locator('input[aria-label="Folder name"]');
      await folderInput.fill('Parent Folder');
      await page.keyboard.press('Enter');

      // Wait for real folder to appear
      const folder = page.locator(folderSelector).filter({ hasText: 'Parent Folder' });
      await expect(folder).toBeVisible({ timeout: 5000 });

      // Right-click and select New Subfolder
      await folder.click({ button: 'right' });

      const subfolderMenuItem = page.locator('[role="menuitem"]').filter({ hasText: /Subfolder/i });
      await subfolderMenuItem.click();

      // Enter subfolder name
      const subfolderInput = page.locator('input[aria-label="Folder name"]');
      await expect(subfolderInput).toBeVisible();
      await subfolderInput.fill('Child Folder');
      await page.keyboard.press('Enter');

      // Expand parent folder to see child (it may be collapsed)
      // Target the expand button within the Parent Folder treeitem specifically
      const parentFolderExpand = folder.locator('button[aria-label="Expand folder"]');
      if (await parentFolderExpand.isVisible()) {
        await parentFolderExpand.click();
      }

      // Verify child folder appears (real folder, nested under parent)
      const childFolder = page.locator(folderSelector).filter({ hasText: 'Child Folder' });
      await expect(childFolder).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Folder Selection', () => {
    test('clicking All Notes selects it', async ({ page }) => {
      // Click All Notes
      const allNotesItem = page.locator('[role="treeitem"]').filter({ hasText: 'All Notes' });
      await allNotesItem.click();

      // Verify selection state
      await expect(allNotesItem).toHaveAttribute('aria-selected', 'true');
    });

    test('clicking a folder selects it', async ({ page }) => {
      // Create a folder
      const createFolderButton = page.locator('button[aria-label="Create folder"]').first();
      await createFolderButton.click();

      const folderInput = page.locator('input[aria-label="Folder name"]');
      await folderInput.fill('Selection Test');
      await page.keyboard.press('Enter');

      // Wait for real folder to appear
      const folder = page.locator(folderSelector).filter({ hasText: 'Selection Test' });
      await expect(folder).toBeVisible({ timeout: 5000 });

      // Click the folder
      await folder.click();

      // The folder should be selected
      await expect(folder).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('View Toggle', () => {
    test('can toggle between tree and flat view', async ({ page }) => {
      // Find the view toggle button
      const flatViewButton = page.locator('[aria-label="Switch to flat view"]');

      if (await flatViewButton.isVisible()) {
        await flatViewButton.click();

        // After clicking, should become tree view button
        const treeViewButton = page.locator('[aria-label="Switch to tree view"]');
        await expect(treeViewButton).toBeVisible();

        // Click again to go back
        await treeViewButton.click();
        await expect(flatViewButton).toBeVisible();
      } else {
        // Already in flat view, look for tree view button
        const treeViewButton = page.locator('[aria-label="Switch to tree view"]');
        await expect(treeViewButton).toBeVisible();
      }
    });
  });
});

// Folder utility functions for path resolution and tree building

import { nanoid } from 'nanoid';
import type { Folder, FolderTreeNode, FolderWithPath } from '../types/folder.types';
import type { Note } from '../types';

// Maximum folder depth to prevent runaway recursion
export const MAX_FOLDER_DEPTH = 20;

// localStorage keys for folder persistence
export const FOLDER_STORAGE_KEYS = {
  FOLDERS: 'sandbooks_folders',
  FOLDER_UI_STATE: 'sandbooks_folder_ui',
} as const;

/**
 * Build folder path from folder ID by walking up the parent chain.
 */
export function computeFolderPath(
  folderId: string,
  folders: Folder[],
  cache?: Map<string, string>
): string {
  if (cache?.has(folderId)) return cache.get(folderId)!;

  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return '';

  const segments: string[] = [folder.name];
  let current = folder;
  let depth = 0;

  while (current.parentId && depth < MAX_FOLDER_DEPTH) {
    const parent = folders.find((f) => f.id === current.parentId);
    if (!parent) break;
    segments.unshift(parent.name);
    current = parent;
    depth++;
  }

  const path = segments.join('/');
  cache?.set(folderId, path);
  return path;
}

/**
 * Resolve a path string to folder ID.
 * e.g., "Work/Projects/Alpha" -> "folder-abc123"
 */
export function resolveFolderIdFromPath(
  path: string,
  folders: Folder[]
): string | null {
  const segments = path.split('/').filter(Boolean);
  let parentId: string | null = null;
  let currentFolder: Folder | undefined;

  for (const segment of segments) {
    currentFolder = folders.find(
      (f) => f.name === segment && f.parentId === parentId
    );
    if (!currentFolder) return null;
    parentId = currentFolder.id;
  }

  return currentFolder?.id ?? null;
}

/**
 * Get all ancestor folder IDs (for breadcrumb navigation).
 */
export function getAncestorFolderIds(
  folderId: string,
  folders: Folder[]
): string[] {
  const ancestors: string[] = [];
  let current = folders.find((f) => f.id === folderId);

  while (current?.parentId) {
    ancestors.unshift(current.parentId);
    current = folders.find((f) => f.id === current!.parentId);
  }

  return ancestors;
}

/**
 * Build folder tree from flat folder array.
 * O(n) using Map for parent lookup.
 */
export function buildFolderTree(
  folders: Folder[],
  notes: Note[],
  expandedFolderIds: Set<string>
): FolderTreeNode[] {
  const folderMap = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  // Create nodes for all folders
  for (const folder of folders) {
    folderMap.set(folder.id, {
      folder,
      children: [],
      noteIds: notes
        .filter((n) => n.folderId === folder.id)
        .map((n) => n.id),
      isExpanded: expandedFolderIds.has(folder.id),
      depth: 0,
    });
  }

  // Build tree structure
  for (const folder of folders) {
    const node = folderMap.get(folder.id)!;

    if (folder.parentId === null) {
      roots.push(node);
    } else {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Orphaned folder - treat as root
        roots.push(node);
      }
    }
  }

  // Sort children by sortOrder and compute depths
  const sortAndComputeDepths = (nodes: FolderTreeNode[], depth: number) => {
    nodes.sort((a, b) => a.folder.sortOrder - b.folder.sortOrder);
    for (const node of nodes) {
      node.depth = depth;
      sortAndComputeDepths(node.children, depth + 1);
    }
  };
  sortAndComputeDepths(roots, 0);

  return roots;
}

/**
 * Flatten folder tree for virtualized rendering.
 */
export function flattenFolderTree(
  tree: FolderTreeNode[]
): FolderTreeNode[] {
  const result: FolderTreeNode[] = [];

  const flatten = (nodes: FolderTreeNode[]) => {
    for (const node of nodes) {
      result.push(node);
      if (node.isExpanded) {
        flatten(node.children);
      }
    }
  };

  flatten(tree);
  return result;
}

/**
 * Validate folder move won't create circular reference.
 */
export function validateFolderMove(
  folderId: string,
  newParentId: string | null,
  folders: Folder[]
): { valid: boolean; error?: string } {
  if (newParentId === null) return { valid: true };
  if (folderId === newParentId) {
    return { valid: false, error: 'Cannot move folder into itself' };
  }

  // Walk up from newParent - if we reach folderId, it's circular
  let current = folders.find((f) => f.id === newParentId);
  const visited = new Set<string>([folderId]);

  while (current) {
    if (visited.has(current.id)) {
      return {
        valid: false,
        error: 'This move would create a circular reference',
      };
    }
    visited.add(current.id);
    current = current.parentId
      ? folders.find((f) => f.id === current!.parentId)
      : undefined;
  }

  return { valid: true };
}

/**
 * Validate folder depth won't exceed maximum.
 */
export function validateFolderDepth(
  parentId: string | null,
  folders: Folder[]
): boolean {
  if (parentId === null) return true;

  let depth = 1;
  let current = folders.find((f) => f.id === parentId);

  while (current?.parentId && depth < MAX_FOLDER_DEPTH) {
    depth++;
    current = folders.find((f) => f.id === current!.parentId);
  }

  return depth < MAX_FOLDER_DEPTH;
}

/**
 * Find orphaned folders (parent doesn't exist).
 */
export function findOrphanedFolders(folders: Folder[]): Folder[] {
  const folderIds = new Set(folders.map((f) => f.id));
  return folders.filter(
    (f) => f.parentId !== null && !folderIds.has(f.parentId)
  );
}

/**
 * Repair orphaned folders by setting parentId to null.
 */
export function repairOrphanedFolders(folders: Folder[]): Folder[] {
  const folderIds = new Set(folders.map((f) => f.id));
  return folders.map((f) => {
    if (f.parentId !== null && !folderIds.has(f.parentId)) {
      return { ...f, parentId: null };
    }
    return f;
  });
}

/**
 * Create a new folder with default values.
 */
export function createFolder(
  name: string,
  parentId: string | null,
  existingFolders: Folder[]
): Folder {
  // Get max sortOrder among siblings
  const siblings = existingFolders.filter((f) => f.parentId === parentId);
  const maxSortOrder = siblings.length > 0
    ? Math.max(...siblings.map((f) => f.sortOrder))
    : -1;

  return {
    id: nanoid(),
    name: name.trim(),
    parentId,
    sortOrder: maxSortOrder + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Get notes in a folder.
 */
export function getNotesInFolder(
  folderId: string,
  notes: Note[],
  folders: Folder[],
  options?: { recursive?: boolean }
): Note[] {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return [];

  // Notes directly in this folder
  let result = notes.filter((n) => n.folderId === folderId);

  // If recursive, include notes from child folders
  if (options?.recursive) {
    const childFolders = folders.filter((f) => f.parentId === folderId);
    for (const child of childFolders) {
      const childNotes = getNotesInFolder(child.id, notes, folders, {
        recursive: true,
      });
      // Avoid duplicates
      const existingIds = new Set(result.map((n) => n.id));
      result = [
        ...result,
        ...childNotes.filter((n) => !existingIds.has(n.id)),
      ];
    }
  }

  return result;
}

/**
 * Add folder path information to a folder.
 */
export function addPathToFolder(
  folder: Folder,
  allFolders: Folder[],
  pathCache?: Map<string, string>
): FolderWithPath {
  const path = computeFolderPath(folder.id, allFolders, pathCache);
  const depth = path.split('/').length - 1;
  return { ...folder, path, depth };
}

/**
 * Normalize sort orders within each parent group to be sequential integers.
 */
export function normalizeSortOrders(folders: Folder[]): Folder[] {
  // Group folders by parentId
  const byParent = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const key = folder.parentId;
    if (!byParent.has(key)) {
      byParent.set(key, []);
    }
    byParent.get(key)!.push(folder);
  }

  // Normalize each group
  const result: Folder[] = [];
  for (const [_parentId, group] of byParent) {
    const sorted = group.sort((a, b) => a.sortOrder - b.sortOrder);
    sorted.forEach((folder, index) => {
      result.push({ ...folder, sortOrder: index });
    });
  }

  return result;
}

/**
 * Sanitize folder name for file system compatibility.
 */
export function sanitizeFolderName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
  return name
    .replace(invalidChars, '-')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'unnamed';
}

/**
 * Load folders from localStorage.
 */
export function loadFoldersFromStorage(): Folder[] {
  try {
    const stored = localStorage.getItem(FOLDER_STORAGE_KEYS.FOLDERS);
    if (!stored) return [];
    const folders = JSON.parse(stored) as Folder[];
    if (!Array.isArray(folders)) return [];

    // Deduplicate by ID (keep first occurrence)
    const seen = new Set<string>();
    const deduped = folders.filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });

    return repairOrphanedFolders(deduped);
  } catch (error) {
    console.error('Failed to load folders from storage:', error);
    return [];
  }
}

/**
 * Save folders to localStorage.
 */
export function saveFoldersToStorage(folders: Folder[]): void {
  try {
    localStorage.setItem(FOLDER_STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  } catch (error) {
    console.error('Failed to save folders to storage:', error);
  }
}

/**
 * Load folder UI state from localStorage.
 */
export function loadFolderUIState(): {
  expandedFolderIds: string[];
  activeFolderId: string | null;
  folderViewMode: 'tree' | 'flat';
} {
  try {
    const stored = localStorage.getItem(FOLDER_STORAGE_KEYS.FOLDER_UI_STATE);
    if (!stored) {
      return {
        expandedFolderIds: [],
        activeFolderId: null,
        folderViewMode: 'tree',
      };
    }
    return JSON.parse(stored);
  } catch {
    return {
      expandedFolderIds: [],
      activeFolderId: null,
      folderViewMode: 'tree',
    };
  }
}

/**
 * Save folder UI state to localStorage.
 */
export function saveFolderUIState(state: {
  expandedFolderIds: string[];
  activeFolderId: string | null;
  folderViewMode: 'tree' | 'flat';
}): void {
  try {
    localStorage.setItem(
      FOLDER_STORAGE_KEYS.FOLDER_UI_STATE,
      JSON.stringify(state)
    );
  } catch (error) {
    console.error('Failed to save folder UI state:', error);
  }
}

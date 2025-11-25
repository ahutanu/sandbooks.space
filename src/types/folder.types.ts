// Folder system type definitions

import type { TagColor } from './tags.types';

export type FolderColor = TagColor;

/**
 * Folder entity for hierarchical note organization.
 * Supports unlimited nesting.
 */
export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null = root level
  color?: FolderColor;
  icon?: string;
  sortOrder: number; // Position within parent
  createdAt: number;
  updatedAt: number;
}

/**
 * Folder with computed path information.
 */
export interface FolderWithPath extends Folder {
  path: string; // e.g., "Work/Projects/Alpha"
  depth: number; // 0 = root
}

/**
 * Folder with children for tree rendering.
 */
export interface FolderWithChildren extends Folder {
  children: FolderWithChildren[];
  noteCount: number; // Direct notes in this folder
  totalNoteCount: number; // Notes in this folder + all descendants
}

/**
 * Tree node for folder hierarchy.
 */
export interface FolderTreeNode {
  folder: Folder;
  children: FolderTreeNode[];
  noteIds: string[]; // Note IDs directly in this folder
  isExpanded: boolean;
  depth: number;
}

/**
 * Folder metadata for GitHub .folder.json files.
 */
export interface FolderMetadata {
  id: string;
  name: string;
  color?: FolderColor;
  icon?: string;
  sortOrder: number;
  createdAt: string; // ISO timestamp for JSON
  updatedAt: string; // ISO timestamp for JSON
}

/**
 * Sort options for notes within a folder.
 */
export type FolderSortOption =
  | 'updatedAt-desc'
  | 'updatedAt-asc'
  | 'createdAt-desc'
  | 'createdAt-asc'
  | 'title-asc'
  | 'title-desc'
  | 'manual';

/**
 * UI state for folder tree.
 */
export interface FolderUIState {
  expandedFolderIds: string[];
  activeFolderId: string | null;
  folderViewMode: 'tree' | 'flat';
  sortOption: FolderSortOption;
}

/**
 * Drag item types for @dnd-kit.
 */
export type DragItemType = 'folder' | 'note';

export interface DragItem {
  type: DragItemType;
  id: string;
  parentId: string | null;
}

/**
 * Drop position for reordering.
 */
export interface DropPosition {
  targetId: string;
  position: 'before' | 'after' | 'inside';
}

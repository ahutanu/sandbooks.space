import { useMemo } from 'react';
import { useNotesStore } from '../../../../store/notesStore';
import type { FolderTreeNode } from '../../../../types/folder.types';
import type { Note } from '../../../../types';

export interface FlattenedTreeItem {
  id: string;
  type: 'folder' | 'note';
  depth: number;
  isExpanded?: boolean;
  hasChildren?: boolean;
  parentId: string | null;
  // For folders
  folder?: FolderTreeNode['folder'];
  noteCount?: number;
  // For notes
  note?: Note;
}

/**
 * Flatten folder tree for rendering (including notes within folders).
 */
function flattenTreeWithNotes(
  tree: FolderTreeNode[],
  notes: Note[],
  activeFolderId: string | null
): FlattenedTreeItem[] {
  const result: FlattenedTreeItem[] = [];

  const processNode = (node: FolderTreeNode) => {
    // Add folder item
    result.push({
      id: node.folder.id,
      type: 'folder',
      depth: node.depth,
      isExpanded: node.isExpanded,
      hasChildren: node.children.length > 0 || node.noteIds.length > 0,
      parentId: node.folder.parentId,
      folder: node.folder,
      noteCount: node.noteIds.length,
    });

    // If expanded, add children and notes
    if (node.isExpanded) {
      // Add child folders first
      for (const child of node.children) {
        processNode(child);
      }

      // Then add notes in this folder
      const folderNotes = notes
        .filter((n) => node.noteIds.includes(n.id))
        .sort((a, b) => (a.folderOrder ?? 0) - (b.folderOrder ?? 0));

      for (const note of folderNotes) {
        result.push({
          id: note.id,
          type: 'note',
          depth: node.depth + 1,
          parentId: node.folder.id,
          note,
        });
      }
    }
  };

  // Process root folders
  for (const node of tree) {
    processNode(node);
  }

  // Add unfiled notes (notes with no folder) if no active folder
  // or if viewing "All Notes" / root level
  if (activeFolderId === null) {
    const unfiledNotes = notes
      .filter((n) => !n.folderId)
      .sort((a, b) => (a.folderOrder ?? 0) - (b.folderOrder ?? 0));

    for (const note of unfiledNotes) {
      result.push({
        id: note.id,
        type: 'note',
        depth: 0,
        parentId: null,
        note,
      });
    }
  }

  return result;
}

/**
 * Hook for folder tree data management.
 */
export function useFolderTree() {
  const notes = useNotesStore((s) => s.notes);
  const folders = useNotesStore((s) => s.folders);
  const expandedFolderIds = useNotesStore((s) => s.expandedFolderIds);
  const activeFolderId = useNotesStore((s) => s.activeFolderId);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const folderViewMode = useNotesStore((s) => s.folderViewMode);

  const getFolderTree = useNotesStore((s) => s.getFolderTree);
  const toggleFolderExpanded = useNotesStore((s) => s.toggleFolderExpanded);
  const setActiveFolder = useNotesStore((s) => s.setActiveFolder);
  const createFolder = useNotesStore((s) => s.createFolder);

  // Build folder tree
  // Note: folders, notes, expandedFolderIds trigger recalculation when they change
  // but the function itself reads from the store, so we need them as dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const folderTree = useMemo(() => getFolderTree(), [
    folders,
    notes,
    expandedFolderIds,
    getFolderTree,
  ]);

  // Flatten tree for rendering
  const flattenedItems = useMemo(
    () => flattenTreeWithNotes(folderTree, notes, activeFolderId),
    [folderTree, notes, activeFolderId]
  );

  // All folders (no more virtual folders)
  const allFolders = folders;

  // Count notes by folder
  const folderNoteCounts = useMemo(() => {
    const counts = new Map<string | null, number>();
    counts.set(null, 0); // Unfiled notes

    for (const folder of allFolders) {
      counts.set(folder.id, 0);
    }

    for (const note of notes) {
      const folderId = note.folderId ?? null;
      counts.set(folderId, (counts.get(folderId) ?? 0) + 1);
    }

    return counts;
  }, [notes, allFolders]);

  // Get unfiled note count
  const unfiledNoteCount = folderNoteCounts.get(null) ?? 0;

  return {
    // Data
    folderTree,
    flattenedItems,
    allFolders,
    folderNoteCounts,
    unfiledNoteCount,

    // State
    activeFolderId,
    activeNoteId,
    expandedFolderIds,
    folderViewMode,

    // Actions
    toggleFolderExpanded,
    setActiveFolder,
    createFolder,
  };
}

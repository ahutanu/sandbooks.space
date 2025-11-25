import { useState, useCallback } from 'react';
import type { DragStartEvent, DragEndEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core';
import { useNotesStore } from '../../../../store/notesStore';

export type DragItemType = 'folder' | 'note';

export interface DragData {
  type: DragItemType;
  id: string;
  parentId: string | null;
}

export interface DropTarget {
  type: 'folder' | 'root';
  id: string | null;
  position?: 'before' | 'after' | 'inside';
}

/**
 * Hook for folder/note drag-and-drop logic.
 */
export function useFolderDnd() {
  const moveFolder = useNotesStore((s) => s.moveFolder);
  const moveNoteToFolder = useNotesStore((s) => s.moveNoteToFolder);
  const reorderNotesInFolder = useNotesStore((s) => s.reorderNotesInFolder);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeData, setActiveData] = useState<DragData | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
    setActiveData(active.data.current as DragData);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setActiveData(null);
      setOverId(null);

      if (!over || active.id === over.id) return;

      const dragData = active.data.current as DragData;
      const dropData = over.data.current as DragData | undefined;

      if (!dragData) return;

      // Handle folder drop
      if (dragData.type === 'folder') {
        // Dropping on another folder - move inside
        if (dropData?.type === 'folder') {
          moveFolder(dragData.id, dropData.id);
        }
        // Dropping on root (null parent)
        else if (over.id === 'root-drop-zone') {
          moveFolder(dragData.id, null);
        }
      }
      // Handle note drop
      else if (dragData.type === 'note') {
        if (dropData?.type === 'folder') {
          // Move note to folder
          moveNoteToFolder(dragData.id, dropData.id);
        } else if (dropData?.type === 'note') {
          // Reorder within same folder or move to note's folder
          const targetNote = dropData;
          if (dragData.parentId === targetNote.parentId) {
            // Same folder - reorder
            // Get current folder's notes and find indices
            const store = useNotesStore.getState();
            const folderNotes = store.notes
              .filter((n) => n.folderId === dragData.parentId)
              .sort((a, b) => (a.folderOrder ?? 0) - (b.folderOrder ?? 0));
            const noteIds = folderNotes.map((n) => n.id);
            const fromIndex = noteIds.indexOf(dragData.id);
            const toIndex = noteIds.indexOf(targetNote.id);

            if (fromIndex !== -1 && toIndex !== -1) {
              // Move item in array
              const newOrder = [...noteIds];
              newOrder.splice(fromIndex, 1);
              newOrder.splice(toIndex, 0, dragData.id);
              reorderNotesInFolder(dragData.parentId, newOrder);
            }
          } else {
            // Different folder - move to target note's folder
            moveNoteToFolder(dragData.id, targetNote.parentId);
          }
        } else if (over.id === 'root-drop-zone') {
          // Move note to root (unfiled)
          moveNoteToFolder(dragData.id, null);
        }
      }
    },
    [moveFolder, moveNoteToFolder, reorderNotesInFolder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveData(null);
    setOverId(null);
  }, []);

  return {
    // State
    activeId,
    activeData,
    overId,

    // Handlers
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}

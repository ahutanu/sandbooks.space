import React from 'react';
import { DragOverlay } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { VscFolder, VscFile } from 'react-icons/vsc';
import type { DragData } from './hooks/useFolderDnd';
import { useNotesStore } from '../../../store/notesStore';

interface TreeDragOverlayProps {
  activeData: DragData | null;
}

/**
 * Drag overlay that shows a preview of the dragged item.
 */
export const TreeDragOverlay: React.FC<TreeDragOverlayProps> = ({ activeData }) => {
  const notes = useNotesStore((s) => s.notes);
  const folders = useNotesStore((s) => s.folders);

  if (!activeData) return null;

  let name = '';
  let Icon = VscFile;

  if (activeData.type === 'folder') {
    const folder = folders.find((f) => f.id === activeData.id);
    name = folder?.name ?? 'Folder';
    Icon = VscFolder;
  } else {
    const note = notes.find((n) => n.id === activeData.id);
    name = note?.title ?? 'Note';
    Icon = VscFile;
  }

  return (
    <DragOverlay dropAnimation={null}>
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-white/95 dark:bg-stone-800/95 backdrop-blur-xl',
          'shadow-elevation-3 border border-stone-200/60 dark:border-stone-700/60',
          'text-sm text-stone-700 dark:text-stone-300',
          'cursor-grabbing'
        )}
        style={{ transform: 'scale(1.02)' }}
      >
        <Icon
          className={clsx(
            'w-4 h-4',
            activeData.type === 'folder'
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-stone-400 dark:text-stone-500'
          )}
        />
        <span className="truncate max-w-[150px]">{name}</span>
      </div>
    </DragOverlay>
  );
};

export default TreeDragOverlay;

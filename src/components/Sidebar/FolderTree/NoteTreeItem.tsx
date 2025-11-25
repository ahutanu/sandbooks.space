import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { VscFile, VscCopy, VscTrash, VscEllipsis } from 'react-icons/vsc';
import type { Note } from '../../../types';
import { formatTimestamp } from '../../../utils/formatTimestamp';
import { ContextMenu } from '../../ui/ContextMenu';
import type { ContextMenuItem } from '../../ui/ContextMenu';

interface NoteTreeItemProps {
  note: Note;
  depth: number;
  isActive: boolean;
  onSelect: (noteId: string) => void;
  onDelete: (noteId: string, noteTitle: string) => void;
  onCopyMarkdown: (noteId: string) => void;
}

export const NoteTreeItem: React.FC<NoteTreeItemProps> = ({
  note,
  depth,
  isActive,
  onSelect,
  onDelete,
  onCopyMarkdown,
}) => {
  const handleClick = useCallback(() => {
    onSelect(note.id);
  }, [note.id, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(note.id);
      }
    },
    [note.id, onSelect]
  );

  const timestamp = formatTimestamp(note.updatedAt);

  // Calculate indentation - matches FolderTreeNode
  const paddingLeft = 12 + depth * 20;

  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'copy-markdown',
      label: 'Copy as Markdown',
      icon: <VscCopy size={14} />,
      onClick: () => onCopyMarkdown(note.id),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <VscTrash size={14} />,
      variant: 'danger',
      onClick: () => onDelete(note.id, note.title),
    },
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      <div
        id={`note-${note.id}`}
        data-note-id={note.id}
        role="treeitem"
        aria-selected={isActive}
        aria-level={depth + 1}
        tabIndex={isActive ? 0 : -1}
        className={clsx(
          'group flex items-center gap-1.5 py-1.5 pr-2 rounded-lg cursor-pointer relative',
          'transition-all duration-200',
          // Solid fills for content layer (no glass-on-glass)
          'hover:bg-stone-100 dark:hover:bg-stone-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-1',
          // Solid active state with left indicator bar
          isActive && [
            'bg-blue-100 dark:bg-blue-900/60',
            // Left indicator bar
            'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
            'before:w-0.5 before:h-4 before:bg-blue-500 before:rounded-r',
            'before:animate-slideInFromLeft',
          ]
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Spacer for alignment with folder chevron */}
        <div className="w-4 flex-shrink-0" />

        {/* File icon */}
        <VscFile className="flex-shrink-0 w-4 h-4 text-stone-400 dark:text-stone-500" />

        {/* Note title and metadata */}
        <div className="flex-1 min-w-0">
          <span
            className={clsx(
              'block truncate text-sm',
              'text-stone-700 dark:text-stone-300',
              isActive && 'font-medium'
            )}
          >
            {note.title || 'Untitled'}
          </span>
          <time
            dateTime={timestamp.datetime}
            title={timestamp.absolute}
            className="block text-xs text-stone-400 dark:text-stone-500 truncate"
          >
            {timestamp.relative}
          </time>
        </div>

        {/* Context menu hint */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity duration-150 pointer-events-none">
          <VscEllipsis size={14} className="text-stone-500 dark:text-stone-400" />
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id, note.title);
          }}
          className={clsx(
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
            'text-stone-400 dark:text-stone-500 hover:text-red-600 dark:hover:text-red-400',
            'transition-[opacity,color,background-color,transform] duration-200',
            // Solid fills for content layer buttons
            'flex-shrink-0 p-1.5 -mr-1 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-1 focus-visible:opacity-100',
            'active:scale-[0.95]'
          )}
          title="Delete note"
          aria-label={`Delete note: ${note.title}`}
          tabIndex={-1}
        >
          <VscTrash size={14} />
        </button>
      </div>
    </ContextMenu>
  );
};

export default NoteTreeItem;

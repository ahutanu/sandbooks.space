import React, { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  VscChevronRight,
  VscFolder,
  VscFolderOpened,
  VscEdit,
  VscTrash,
  VscNewFolder,
  VscEllipsis,
} from 'react-icons/vsc';
import type { Folder } from '../../../types/folder.types';
import { getTagColorClasses } from '../../../utils/tagColors';
import { ContextMenu } from '../../ui/ContextMenu';
import type { ContextMenuItem } from '../../ui/ContextMenu';

interface FolderTreeNodeProps {
  folder: Folder;
  depth: number;
  isExpanded: boolean;
  isActive: boolean;
  noteCount: number;
  hasChildren: boolean;
  onToggleExpand: (folderId: string) => void;
  onSelect: (folderId: string) => void;
  onRename?: (folderId: string) => void;
  onDelete?: (folderId: string) => void;
  onCreateSubfolder?: (parentId: string) => void;
}

export const FolderTreeNode: React.FC<FolderTreeNodeProps> = ({
  folder,
  depth,
  isExpanded,
  isActive,
  noteCount,
  hasChildren,
  onToggleExpand,
  onSelect,
  onRename,
  onDelete,
  onCreateSubfolder,
}) => {
  const handleClick = useCallback(() => {
    onSelect(folder.id);
  }, [folder.id, onSelect]);

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(folder.id);
    },
    [folder.id, onToggleExpand]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(folder.id);
      } else if (e.key === 'ArrowRight' && !isExpanded && hasChildren) {
        e.preventDefault();
        onToggleExpand(folder.id);
      } else if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault();
        onToggleExpand(folder.id);
      } else if (e.key === 'F2' && onRename) {
        e.preventDefault();
        onRename(folder.id);
      } else if (e.key === 'Delete' && onDelete) {
        e.preventDefault();
        onDelete(folder.id);
      }
    },
    [folder.id, isExpanded, hasChildren, onSelect, onToggleExpand, onRename, onDelete]
  );

  // Calculate indentation - 16px base + 20px per depth level
  const paddingLeft = 12 + depth * 20;

  // Get color classes for folder (if it has a color from associated tag)
  const colorClasses = folder.color ? getTagColorClasses(folder.color) : null;

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    const items: ContextMenuItem[] = [];

    if (onCreateSubfolder) {
      items.push({
        id: 'create-subfolder',
        label: 'New Subfolder',
        icon: <VscNewFolder size={14} />,
        onClick: () => onCreateSubfolder(folder.id),
      });
    }

    if (onRename) {
      items.push({
        id: 'rename',
        label: 'Rename',
        icon: <VscEdit size={14} />,
        shortcut: 'F2',
        onClick: () => onRename(folder.id),
      });
    }

    if (onDelete) {
      items.push({
        id: 'delete',
        label: 'Delete',
        icon: <VscTrash size={14} />,
        variant: 'danger',
        onClick: () => onDelete(folder.id),
      });
    }

    return items;
  }, [folder.id, onCreateSubfolder, onRename, onDelete]);

  const content = (
    <div
      id={`folder-${folder.id}`}
      data-folder-id={folder.id}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
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
          'bg-amber-100 dark:bg-amber-900/50',
          // Left indicator bar for folders
          'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
          'before:w-0.5 before:h-4 before:bg-amber-500 before:rounded-r',
          'before:animate-slideInFromLeft',
        ]
      )}
      style={{ paddingLeft }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Expand/collapse chevron */}
      <button
        type="button"
        className={clsx(
          'flex-shrink-0 p-0.5 rounded transition-all duration-200',
          'hover:bg-stone-200 dark:hover:bg-stone-700',
          !hasChildren && 'invisible'
        )}
        onClick={handleToggleExpand}
        tabIndex={-1}
        aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
      >
        <VscChevronRight
          className={clsx(
            'w-3.5 h-3.5 text-stone-400 dark:text-stone-500',
            'transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        />
      </button>

      {/* Folder icon */}
      {isExpanded ? (
        <VscFolderOpened
          className={clsx(
            'flex-shrink-0 w-4 h-4',
            colorClasses?.text || 'text-amber-500 dark:text-amber-400'
          )}
        />
      ) : (
        <VscFolder
          className={clsx(
            'flex-shrink-0 w-4 h-4',
            colorClasses?.text || 'text-amber-500 dark:text-amber-400'
          )}
        />
      )}

      {/* Folder name */}
      <span
        className={clsx(
          'flex-1 truncate text-sm',
          'text-stone-700 dark:text-stone-300',
          isActive && 'font-medium'
        )}
      >
        {folder.name}
      </span>

      {/* Context menu hint */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity duration-150 pointer-events-none">
        <VscEllipsis size={14} className="text-stone-500 dark:text-stone-400" />
      </div>

      {/* Note count badge */}
      {noteCount > 0 && (
        <span
          className={clsx(
            'flex-shrink-0 px-1.5 py-0.5 text-xs rounded-full',
            // Solid fills for content layer badges
            'bg-stone-200 dark:bg-stone-700',
            'text-stone-500 dark:text-stone-400',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
            isActive && 'opacity-100'
          )}
        >
          {noteCount}
        </span>
      )}
    </div>
  );

  // Wrap with context menu if there are items
  if (contextMenuItems.length > 0) {
    return <ContextMenu items={contextMenuItems}>{content}</ContextMenu>;
  }

  return content;
};

export default FolderTreeNode;

import React, { useCallback, useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { AnimatePresence, m } from 'framer-motion';
import { VscFolder, VscNewFolder, VscListTree, VscListFlat } from 'react-icons/vsc';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useNotesStore } from '../../../store/notesStore';
import { useFolderTree } from './hooks/useFolderTree';
import { useFolderDnd, type DragData } from './hooks/useFolderDnd';
import { FolderTreeNode } from './FolderTreeNode';
import { NoteTreeItem } from './NoteTreeItem';
import { CreateFolderInline } from './CreateFolderInline';
import { RenameFolderInline } from './RenameFolderInline';
import { DraggableTreeItem } from './DraggableTreeItem';
import { TreeDragOverlay } from './TreeDragOverlay';
import { serializeToMarkdown } from '../../../utils/markdownSerializer';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { showToast } from '../../../utils/toast';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { listItemVariants } from '../../../utils/animationVariants';

interface FolderTreeProps {
  isMobile?: boolean;
}

export const FolderTree: React.FC<FolderTreeProps> = ({ isMobile = false }) => {
  const {
    flattenedItems,
    activeFolderId,
    activeNoteId,
    expandedFolderIds,
    folderViewMode,
    folderNoteCounts,
    toggleFolderExpanded,
    setActiveFolder,
    createFolder,
  } = useFolderTree();

  const notes = useNotesStore((s) => s.notes);
  const folders = useNotesStore((s) => s.folders);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const deleteFolder = useNotesStore((s) => s.deleteFolder);
  const updateFolder = useNotesStore((s) => s.updateFolder);
  const setFolderViewMode = useNotesStore((s) => s.setFolderViewMode);

  // Drag and drop
  const {
    activeId,
    activeData,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useFolderDnd();

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Start drag after 8px movement
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // State for inline folder creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);

  // State for inline folder rename
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);

  // Delete confirmation state - can be either note or folder
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'note' | 'folder';
    id: string;
    title: string;
  } | null>(null);

  const { copy } = useCopyToClipboard({
    onSuccess: () => showToast.success('Copied to clipboard'),
    onError: (err) => showToast.error(err.message || 'Failed to copy'),
  });

  const handleFolderSelect = useCallback(
    (folderId: string) => {
      setActiveFolder(folderId);
    },
    [setActiveFolder]
  );

  const handleNoteSelect = useCallback(
    (noteId: string) => {
      setActiveNote(noteId);
    },
    [setActiveNote]
  );

  // Note delete handlers
  const handleDeleteNote = useCallback((noteId: string, noteTitle: string) => {
    setDeleteConfirm({ type: 'note', id: noteId, title: noteTitle });
  }, []);

  // Folder delete handlers
  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        setDeleteConfirm({ type: 'folder', id: folderId, title: folder.name });
      }
    },
    [folders]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'note') {
      // Delete immediately - AnimatePresence handles exit animation
      deleteNote(deleteConfirm.id);
      setDeleteConfirm(null);
    } else {
      // Folder delete - immediate
      deleteFolder(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast.success('Folder deleted');
    }
  }, [deleteConfirm, deleteNote, deleteFolder]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  const handleCopyMarkdown = useCallback(
    (noteId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (note?.content) {
        const markdown = serializeToMarkdown(note.content);
        copy(markdown);
      }
    },
    [notes, copy]
  );

  // Folder creation handlers
  const handleCreateFolder = useCallback(
    (name: string) => {
      createFolder(name, createFolderParentId);
      setIsCreatingFolder(false);
      setCreateFolderParentId(null);
      showToast.success('Folder created');
    },
    [createFolder, createFolderParentId]
  );

  const handleCancelCreateFolder = useCallback(() => {
    setIsCreatingFolder(false);
    setCreateFolderParentId(null);
  }, []);

  const handleStartCreateFolder = useCallback((parentId: string | null = null) => {
    setRenamingFolderId(null); // Cancel any rename in progress
    setCreateFolderParentId(parentId);
    setIsCreatingFolder(true);
    // Auto-expand parent folder so the inline input and new subfolder are visible
    if (parentId && !expandedFolderIds.has(parentId)) {
      toggleFolderExpanded(parentId);
    }
  }, [expandedFolderIds, toggleFolderExpanded]);

  // Folder rename handlers
  const handleStartRename = useCallback((folderId: string) => {
    setIsCreatingFolder(false); // Cancel any create in progress
    setRenamingFolderId(folderId);
  }, []);

  const handleConfirmRename = useCallback(
    (newName: string) => {
      if (renamingFolderId) {
        updateFolder(renamingFolderId, { name: newName });
        showToast.success('Folder renamed');
      }
      setRenamingFolderId(null);
    },
    [renamingFolderId, updateFolder]
  );

  const handleCancelRename = useCallback(() => {
    setRenamingFolderId(null);
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setFolderViewMode(folderViewMode === 'tree' ? 'flat' : 'tree');
  }, [folderViewMode, setFolderViewMode]);

  // Memoize sortable IDs
  const sortableIds = useMemo(
    () => flattenedItems.map((item) => item.id),
    [flattenedItems]
  );

  // "All Notes" header row
  const totalNoteCount = notes.length;
  const isAllNotesActive = activeFolderId === null;

  // Wrap drag handlers to match expected types
  const onDragStart = useCallback(
    (event: DragStartEvent) => handleDragStart(event),
    [handleDragStart]
  );
  const onDragOver = useCallback(
    (event: DragOverEvent) => handleDragOver(event),
    [handleDragOver]
  );
  const onDragEnd = useCallback(
    (event: DragEndEvent) => handleDragEnd(event),
    [handleDragEnd]
  );

  // Get delete confirmation message
  const getDeleteMessage = () => {
    if (!deleteConfirm) return '';
    if (deleteConfirm.type === 'note') {
      return `"${deleteConfirm.title}" will be permanently deleted. This action cannot be undone.`;
    }
    return `"${deleteConfirm.title}" and all its contents will be permanently deleted. Notes in this folder will become unfiled. This action cannot be undone.`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with glass styling */}
      <div className={clsx(
        "flex items-center justify-between px-3 py-2",
        "border-b border-stone-200/40 dark:border-stone-700/40",
        "bg-stone-50/60 dark:bg-stone-800/40",
        "shadow-[inset_0_-1px_0_rgba(0,0,0,0.02)]",
        "dark:shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]"
      )}>
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          Folders
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleViewMode}
            className={clsx(
              'p-1.5 rounded-md transition-all duration-150',
              'text-stone-400 dark:text-stone-500',
              'hover:bg-stone-200/60 dark:hover:bg-stone-700/50 hover:text-stone-600 dark:hover:text-stone-300'
            )}
            title={folderViewMode === 'tree' ? 'Switch to flat view' : 'Switch to tree view'}
            aria-label={folderViewMode === 'tree' ? 'Switch to flat view' : 'Switch to tree view'}
          >
            {folderViewMode === 'tree' ? (
              <VscListFlat size={16} />
            ) : (
              <VscListTree size={16} />
            )}
          </button>
          <button
            onClick={() => handleStartCreateFolder(null)}
            className={clsx(
              'p-1.5 rounded-md transition-all duration-150',
              'text-stone-400 dark:text-stone-500',
              'hover:bg-stone-200/60 dark:hover:bg-stone-700/50 hover:text-stone-600 dark:hover:text-stone-300'
            )}
            title="Create folder"
            aria-label="Create folder"
          >
            <VscNewFolder size={16} />
          </button>
        </div>
      </div>

      {/* Tree content with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          role="tree"
          aria-label="Folder tree"
          className={clsx(
            'flex-1 overflow-y-auto py-2 px-1',
            isMobile && 'pb-safe'
          )}
        >
          {/* All Notes row - view filter, not selection indicator */}
          <div
            id="root-drop-zone"
            role="treeitem"
            aria-selected={isAllNotesActive}
            tabIndex={isAllNotesActive ? 0 : -1}
            className={clsx(
              'group flex items-center gap-1.5 py-1.5 px-3 rounded-lg cursor-pointer relative',
              'transition-all duration-200',
              // Solid fills for content layer (no glass-on-glass)
              'hover:bg-stone-100 dark:hover:bg-stone-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-1',
              // Solid active state for "current view"
              isAllNotesActive && 'bg-stone-100 dark:bg-stone-800'
            )}
            onClick={() => setActiveFolder(null)}
          >
            <VscFolder
              className={clsx(
                'flex-shrink-0 w-4 h-4 transition-colors duration-150',
                isAllNotesActive
                  ? 'text-stone-500 dark:text-stone-400'
                  : 'text-stone-400 dark:text-stone-500'
              )}
            />
            <span
              className={clsx(
                'flex-1 truncate text-sm transition-colors duration-150',
                isAllNotesActive
                  ? 'text-stone-800 dark:text-stone-200 font-medium'
                  : 'text-stone-600 dark:text-stone-400'
              )}
            >
              All Notes
            </span>
            <span
              className={clsx(
                'flex-shrink-0 px-1.5 py-0.5 text-xs rounded-full transition-colors duration-150',
                // Solid fills for content layer badges
                isAllNotesActive
                  ? 'bg-stone-300 dark:bg-stone-600 text-stone-600 dark:text-stone-300'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-500'
              )}
            >
              {totalNoteCount}
            </span>
          </div>

          {/* Inline folder creation at root level */}
          {isCreatingFolder && createFolderParentId === null && (
            <CreateFolderInline
              depth={0}
              onConfirm={handleCreateFolder}
              onCancel={handleCancelCreateFolder}
            />
          )}

          {/* Sortable tree items with AnimatePresence for exit animations */}
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {flattenedItems.map((item) => {
                if (item.type === 'folder' && item.folder) {
                  const isRenaming = renamingFolderId === item.id;
                  const dragData: DragData = {
                    type: 'folder',
                    id: item.id,
                    parentId: item.parentId,
                  };

                  // Show rename UI instead of normal folder node
                  if (isRenaming) {
                    return (
                      <RenameFolderInline
                        key={item.id}
                        depth={item.depth}
                        currentName={item.folder.name}
                        onConfirm={handleConfirmRename}
                        onCancel={handleCancelRename}
                      />
                    );
                  }

                  return (
                    <m.div
                      key={item.id}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      <DraggableTreeItem
                        id={item.id}
                        data={dragData}
                      >
                        <FolderTreeNode
                          folder={item.folder}
                          depth={item.depth}
                          isExpanded={expandedFolderIds.has(item.id)}
                          isActive={activeFolderId === item.id}
                          noteCount={folderNoteCounts.get(item.id) ?? 0}
                          hasChildren={item.hasChildren ?? false}
                          onToggleExpand={toggleFolderExpanded}
                          onSelect={handleFolderSelect}
                          onRename={handleStartRename}
                          onDelete={handleDeleteFolder}
                          onCreateSubfolder={handleStartCreateFolder}
                        />
                      </DraggableTreeItem>
                      {/* Inline folder creation as child of this folder */}
                      {isCreatingFolder && createFolderParentId === item.id && (
                        <CreateFolderInline
                          depth={item.depth + 1}
                          onConfirm={handleCreateFolder}
                          onCancel={handleCancelCreateFolder}
                        />
                      )}
                    </m.div>
                  );
                }

                if (item.type === 'note' && item.note) {
                  const dragData: DragData = {
                    type: 'note',
                    id: item.id,
                    parentId: item.parentId,
                  };

                  return (
                    <m.div
                      key={item.id}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      <DraggableTreeItem id={item.id} data={dragData}>
                        <NoteTreeItem
                          note={item.note}
                          depth={item.depth}
                          isActive={activeNoteId === item.id}
                          onSelect={handleNoteSelect}
                          onDelete={handleDeleteNote}
                          onCopyMarkdown={handleCopyMarkdown}
                        />
                      </DraggableTreeItem>
                    </m.div>
                  );
                }

                return null;
              })}
            </AnimatePresence>
          </SortableContext>
        </div>

        {/* Drag overlay */}
        <TreeDragOverlay activeData={activeId ? activeData : null} />
      </DndContext>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title={deleteConfirm?.type === 'folder' ? 'Delete folder?' : 'Delete note?'}
        message={getDeleteMessage()}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default FolderTree;

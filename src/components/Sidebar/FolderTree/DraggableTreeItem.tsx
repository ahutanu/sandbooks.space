import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import type { DragData } from './hooks/useFolderDnd';

interface DraggableTreeItemProps {
  id: string;
  data: DragData;
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * Wrapper component that makes tree items draggable.
 */
export const DraggableTreeItem: React.FC<DraggableTreeItemProps> = ({
  id,
  data,
  disabled = false,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    data,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'relative transition-all duration-150',
        isDragging && 'opacity-40 z-50 scale-[0.98]',
        isOver && 'bg-blue-50/60 dark:bg-blue-900/25 rounded-lg ring-1 ring-blue-400/30'
      )}
      {...attributes}
      {...listeners}
    >
      {children}

      {/* Drop indicator line */}
      {isOver && !isDragging && (
        <div className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-500 rounded-full shadow-[0_0_6px_rgba(59,130,246,0.5)] animate-pulse" />
      )}
    </div>
  );
};

export default DraggableTreeItem;

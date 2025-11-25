import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { VscFolder, VscCheck, VscClose } from 'react-icons/vsc';

interface CreateFolderInlineProps {
  depth: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  placeholder?: string;
}

export const CreateFolderInline: React.FC<CreateFolderInlineProps> = ({
  depth,
  onConfirm,
  onCancel,
  placeholder = 'New folder',
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onConfirm(trimmedName);
    } else {
      onCancel();
    }
  }, [name, onConfirm, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [handleSubmit, onCancel]
  );

  const handleBlur = useCallback(() => {
    // Small delay to allow button clicks to register
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        handleSubmit();
      }
    }, 100);
  }, [handleSubmit]);

  // Calculate indentation - matches FolderTreeNode
  const paddingLeft = 12 + depth * 20;

  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 py-1 pr-2 rounded-lg',
        // Solid fills for content layer (no glass-on-glass)
        'bg-blue-50 dark:bg-blue-900/40',
        'ring-1 ring-blue-400/50 dark:ring-blue-500/40',
        'animate-slideInFromLeft'
      )}
      style={{ paddingLeft }}
    >
      {/* Spacer for alignment with folder chevron */}
      <div className="w-4 flex-shrink-0" />

      {/* Folder icon */}
      <VscFolder className="flex-shrink-0 w-4 h-4 text-amber-500 dark:text-amber-400" />

      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={clsx(
          'flex-1 min-w-0 px-1.5 py-0.5 text-sm rounded',
          // Solid fills for content layer inputs
          'bg-white dark:bg-stone-800',
          'text-stone-700 dark:text-stone-300',
          'placeholder-stone-400 dark:placeholder-stone-500',
          'border border-stone-300 dark:border-stone-600',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-transparent'
        )}
        aria-label="Folder name"
      />

      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={handleSubmit}
          className={clsx(
            'p-1 rounded transition-all duration-150',
            'text-green-600 dark:text-green-400',
            // Solid fills for content layer buttons
            'hover:bg-green-100 dark:hover:bg-green-900/50'
          )}
          title="Create folder"
          aria-label="Create folder"
          tabIndex={-1}
        >
          <VscCheck size={14} />
        </button>
        <button
          onClick={onCancel}
          className={clsx(
            'p-1 rounded transition-all duration-150',
            'text-stone-500 dark:text-stone-400',
            // Solid fills for content layer buttons
            'hover:bg-stone-200 dark:hover:bg-stone-700'
          )}
          title="Cancel"
          aria-label="Cancel"
          tabIndex={-1}
        >
          <VscClose size={14} />
        </button>
      </div>
    </div>
  );
};

export default CreateFolderInline;

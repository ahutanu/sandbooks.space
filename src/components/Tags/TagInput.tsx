import React, { useState, useRef } from 'react';
import { TagPill } from './TagPill';
import type { Tag } from '../../types/tags.types';
import { useNotesStore } from '../../store/notesStore';

interface TagInputProps {
  noteId: string;
  tags: Tag[];
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({ noteId, tags, className = '' }) => {
  const [input, setInput] = useState('');
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addTag, addTagToNote, removeTagFromNote } = useNotesStore();

  const handleAddTag = (tagName: string) => {
    const cleaned = tagName.trim();
    if (!cleaned) return;

    // Check for duplicate
    if (tags.some((t) => t.name.toLowerCase() === cleaned.toLowerCase())) {
      setShowError(true);
      setTimeout(() => setShowError(false), 500);
      return;
    }

    // Check if tag already exists in global tags
    const existingTag = useNotesStore.getState().tags.find(
      (t) => t.name.toLowerCase() === cleaned.toLowerCase()
    );

    const tag = existingTag || addTag(cleaned);
    addTagToNote(noteId, tag);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      handleAddTag(input);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    removeTagFromNote(noteId, tagId);
  };

  return (
    <div className={`${className}`}>
      <div
        className={`
        flex flex-wrap items-center gap-2 p-3 rounded-xl border-2
        bg-white dark:bg-stone-900
        focus-within:border-blue-500 dark:focus-within:border-blue-400
        focus-within:ring-4 focus-within:ring-blue-500/20
        transition-all duration-200
        ${
          showError
            ? 'border-rose-500 dark:border-rose-400 ring-4 ring-rose-500/20 animate-shake'
            : 'border-stone-200 dark:border-stone-700'
        }
      `}
      >
        {/* Existing tags */}
        {tags.map((tag) => (
          <TagPill
            key={tag.id}
            tag={tag}
            size="sm"
            onRemove={handleRemoveTag}
            interactive={false}
            showColorPicker={true}
          />
        ))}

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Add tags...' : ''}
          className="flex-1 min-w-[120px] px-0 py-1 bg-transparent border-none outline-none text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
          aria-label="Add tags to note. Press comma or Enter to create tag."
        />
      </div>

      {/* Help text */}
      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
        Press <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-600 font-mono text-xs">
          Enter
        </kbd>{' '}
        or{' '}
        <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-600 font-mono text-xs">
          ,
        </kbd>{' '}
        to add tag
      </p>
    </div>
  );
};

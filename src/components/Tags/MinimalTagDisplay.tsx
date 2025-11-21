import React, { useState } from 'react';
import type { Tag } from '../../types/tags.types';
import { useNotesStore } from '../../store/notesStore';
import { TagColorPicker } from './TagColorPicker';

interface MinimalTagDisplayProps {
  noteId: string;
  tags: Tag[];
}

// Minimal inline tag display - appears at bottom of note content
export const MinimalTagDisplay: React.FC<MinimalTagDisplayProps> = ({ noteId, tags }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [colorPickerTagId, setColorPickerTagId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { addTag, addTagToNote, removeTagFromNote, resetOnboardingDocs } = useNotesStore();

  const handleAddTag = () => {
    const cleaned = input.trim();
    if (!cleaned) return;

    // Check for duplicate
    if (tags.some((t) => t.name.toLowerCase() === cleaned.toLowerCase())) {
      return;
    }

    const existingTag = useNotesStore.getState().tags.find(
      (t) => t.name.toLowerCase() === cleaned.toLowerCase()
    );

    const tag = existingTag || addTag(cleaned);
    addTagToNote(noteId, tag);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      setInput('');
    }
  };

  // Get solid color for dot
  const getDotColor = (color: string): string => {
    const colorMap: Record<string, string> = {
      gray: '#78716c',
      red: '#ef4444',
      orange: '#f97316',
      amber: '#f59e0b',
      yellow: '#eab308',
      green: '#22c55e',
      emerald: '#10b981',
      blue: '#3b82f6',
      indigo: '#6366f1',
      purple: '#a855f7',
      pink: '#ec4899',
      rose: '#f43f5e',
    };
    return colorMap[color] || '#3b82f6';
  };

  if (!isExpanded && tags.length === 0) {
    // Hidden state - just a tiny add button
    return (
      <div className="flex items-center justify-end py-2 px-4 opacity-0 hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-colors duration-200"
          aria-label="Add tags"
        >
          + tag
        </button>
      </div>
    );
  }

  const handleResetNotes = () => {
    const confirmed = window.confirm('Reset notes to the built-in tour? This replaces all current notes. Export first if you need a backup.');
    if (!confirmed) return;
    resetOnboardingDocs({ source: 'inline-reset' });
  };

  return (
    <div className="py-3 px-4 border-t border-stone-200/50 dark:border-stone-700/50">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {/* Existing tags - minimal dots + text */}
        {tags.map((tag) => (
          <div key={tag.id} className="inline-flex items-center gap-1.5 group">
            {/* Clickable color dot for color picker */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setColorPickerTagId(tag.id);
                  setAnchorEl(e.currentTarget);
                }}
                className="w-1.5 h-1.5 rounded-full transition-transform duration-200 hover:scale-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                style={{ backgroundColor: getDotColor(tag.color) }}
                aria-label={`Change color for ${tag.name} tag`}
                title="Click to change color"
            />

            {/* Tag name with remove functionality */}
            <button
              onClick={() => removeTagFromNote(noteId, tag.id)}
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors duration-200 font-medium"
              aria-label={`Remove ${tag.name} tag`}
              title={`Click to remove ${tag.name}`}
            >
              {tag.name}
            </button>

            <span className="opacity-0 group-hover:opacity-100 text-stone-400 text-[10px] transition-opacity duration-200">
              ×
            </span>

            {/* Color Picker for this tag */}
            {colorPickerTagId === tag.id && (
              <TagColorPicker
                tagId={tag.id}
                tagName={tag.name}
                currentColor={tag.color}
                isOpen={true}
                onClose={() => {
                  setColorPickerTagId(null);
                  setAnchorEl(null);
                }}
                anchorEl={anchorEl}
              />
            )}
          </div>
        ))}

        {/* Add tag button/input */}
        {isExpanded ? (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!input) setIsExpanded(false);
            }}
            placeholder="tag name..."
            className="w-24 px-1 py-0.5 text-xs bg-transparent border-b border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-blue-500"
            autoFocus
            aria-label="Enter tag name"
          />
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs text-stone-400 dark:text-stone-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            aria-label="Add tag"
          >
            + tag
          </button>
        )}

        {/* Reset control - tiny, tucked to the far right */}
        <div className="ml-auto">
          <button
            onClick={handleResetNotes}
            className="text-[11px] text-stone-400 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200 underline decoration-dotted decoration-1"
            aria-label="Reset notes to built-in docs"
          >
            reset notes
          </button>
        </div>
      </div>
    </div>
  );
};

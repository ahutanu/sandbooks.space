import { useState, useRef, useEffect } from 'react';
import type { Note } from '../../types';

interface NoteTitleProps {
  note: Note;
  onUpdate: (title: string) => void;
}

export const NoteTitle = ({ note, onUpdate }: NoteTitleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (title !== note.title) {
      setTitle(note.title);
    }
  }, [note.id, note.title, title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (title.trim() && title !== note.title) {
      onUpdate(title.trim());
    } else if (!title.trim()) {
      setTitle(note.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setTitle(note.title);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="text-4xl font-bold text-stone-900 dark:text-stone-50 bg-transparent border-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 rounded-lg px-3 -mx-3 w-full transition-colors duration-200 placeholder-stone-300 dark:placeholder-stone-600 leading-tight tracking-tight"
        placeholder="Untitled Note"
        aria-label="Edit note title"
      />
    );
  }

  const handleClick = () => setIsEditing(true);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsEditing(true);
    }
  };

  return (
    <h1
      onClick={handleClick}
      onKeyDown={handleKeyPress}
      tabIndex={0}
      role="button"
      className="text-4xl font-bold text-stone-900 dark:text-stone-50 cursor-text hover:text-stone-700 dark:hover:text-stone-200 transition-colors duration-200 leading-tight tracking-tight focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 rounded-lg px-3 -mx-3"
      aria-label="Click to edit note title"
    >
      {note.title}
    </h1>
  );
};

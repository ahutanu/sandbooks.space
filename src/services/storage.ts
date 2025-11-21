import type { Note } from '../types';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'sandbooks_notes';

export const storageService = {
  getNotes(): Note[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (_error) {
      // Silent fail for localStorage read errors
      return [];
    }
  },

  saveNotes(notes: Note[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        toast.error('Storage quota exceeded. Please export and clear some notes.');
      } else {
        toast.error('Failed to save notes to local storage');
      }
    }
  },

  exportNotes(notes: Note[]): string {
    return JSON.stringify(notes, null, 2);
  },

  importNotes(jsonString: string): Note[] {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid format: expected an array of notes');
      }
      // Validate structure
      return parsed.filter((note: Note) =>
        note.id &&
        note.title !== undefined &&
        note.content &&
        note.createdAt &&
        note.updatedAt
      );
    } catch (_error) {
      throw new Error('Invalid notes file format');
    }
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};

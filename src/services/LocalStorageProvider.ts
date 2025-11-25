import type { Note } from '../types';
import { showToast as toast } from '../utils/toast';
import { sanitizeNotes } from '../utils/contentSanitizer';
import type { StorageProvider, StorageProviderMetadata } from './StorageProvider';

const STORAGE_KEY = 'sandbooks_notes';

/**
 * LocalStorage implementation of StorageProvider
 * Provides synchronous storage using browser's localStorage API
 */
export class LocalStorageProvider implements StorageProvider {
    readonly metadata: StorageProviderMetadata = {
        type: 'localStorage',
        name: 'Local Storage',
        icon: 'computer',
        isOnline: false
    };

    private saveLock: Promise<void> = Promise.resolve();

    async getNotes(): Promise<Note[]> {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data || data === 'null') return [];
            const notes = JSON.parse(data) as Note[];
            // Sanitize content to remove empty text nodes that cause TipTap errors
            return sanitizeNotes(notes);
        } catch (_error) {
            return [];
        }
    }

    async saveNote(note: Note): Promise<void> {
        // Acquire lock to prevent race conditions
        this.saveLock = this.saveLock.then(async () => {
            const notes = await this.getNotes();
            const index = notes.findIndex(n => n.id === note.id);

            if (index >= 0) {
                notes[index] = note;
            } else {
                notes.push(note);
            }

            await this.saveAllNotes(notes);
        });

        return this.saveLock;
    }

    async updateNote(note: Note): Promise<void> {
        // For localStorage, update is the same as save
        return this.saveNote(note);
    }

    async deleteNote(noteId: string): Promise<void> {
        this.saveLock = this.saveLock.then(async () => {
            const notes = await this.getNotes();
            const filtered = notes.filter(n => n.id !== noteId);
            await this.saveAllNotes(filtered);
        });

        return this.saveLock;
    }

    async saveAllNotes(notes: Note[]): Promise<void> {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                toast.error('Storage quota exceeded. Please export and clear some notes.');
                throw error;
            } else {
                toast.error('Failed to save notes to local storage');
                throw error;
            }
        }
    }

    exportNotes(notes: Note[]): string {
        return JSON.stringify(notes, null, 2);
    }

    importNotes(jsonString: string): Note[] {
        try {
            const parsed = JSON.parse(jsonString);
            if (!Array.isArray(parsed)) {
                throw new Error('Invalid format: expected an array of notes');
            }
            return parsed.filter((note: Note) =>
                note.id &&
                note.title !== undefined &&
                note.content &&
                note.createdAt &&
                note.updatedAt
            );
        } catch (error) {
            if (error instanceof Error && error.message.includes('expected an array')) {
                throw error;
            }
            throw new Error('Invalid notes file format');
        }
    }

    async clear(): Promise<void> {
        localStorage.removeItem(STORAGE_KEY);
    }

    isConnected(): boolean {
        return true; // LocalStorage is always available
    }
}

// Singleton instance for default usage
export const localStorageProvider = new LocalStorageProvider();

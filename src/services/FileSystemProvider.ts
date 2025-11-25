import type { Note } from '../types';
import { nanoid } from 'nanoid';
import { serializeToMarkdown, parseMarkdown } from '../utils/markdownSerializer';
import { sanitizeNoteContent } from '../utils/contentSanitizer';
import type { JSONContent } from '@tiptap/core';
import type { StorageProvider, StorageProviderMetadata } from './StorageProvider';

// Type definitions for File System Access API
export interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
}

export interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
    values(): AsyncIterableIterator<FileSystemHandle>;
}

interface FileSystemWritableFileStream extends WritableStream {
    write(data: string | BufferSource | Blob): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
    close(): Promise<void>;
}

/**
 * File System implementation of StorageProvider
 * Stores notes as Markdown files with YAML frontmatter in a local directory
 */
export class FileSystemProvider implements StorageProvider {
    private handle: FileSystemDirectoryHandle | null = null;

    get metadata(): StorageProviderMetadata {
        return {
            type: 'fileSystem',
            name: this.handle?.name || 'File System',
            icon: 'folder',
            isOnline: false
        };
    }

    /**
     * Prompt user to select a folder
     */
    async connect(): Promise<void> {
        // @ts-expect-error - showDirectoryPicker not in TS types yet
        this.handle = await window.showDirectoryPicker();
    }

    /**
     * Disconnect from the folder
     */
    async disconnect(): Promise<void> {
        this.handle = null;
    }

    isConnected(): boolean {
        return this.handle !== null;
    }

    async getNotes(): Promise<Note[]> {
        if (!this.handle) {
            throw new Error('File system not connected. Call connect() first.');
        }

        const notes: Note[] = [];
        const seenIds = new Set<string>();

        // Recursively walk the directory to find all .md files
        async function* walk(dir: FileSystemDirectoryHandle): AsyncGenerator<FileSystemFileHandle> {
            for await (const entry of dir.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                    yield entry as FileSystemFileHandle;
                } else if (entry.kind === 'directory') {
                    yield* walk(entry as FileSystemDirectoryHandle);
                }
            }
        }

        for await (const handle of walk(this.handle)) {
            try {
                const file = await handle.getFile();
                const text = await file.text();
                let note = this.parseNoteFile(text, handle.name, '');

                // Ensure ID uniqueness to prevent UI glitches (e.g. sidebar highlighting)
                if (seenIds.has(note.id)) {
                    console.warn(`Duplicate note ID found: ${note.id} in file ${handle.name}. Generating new ID.`);
                    note.id = nanoid();
                }
                seenIds.add(note.id);

                // Sanitize content to remove empty text nodes that cause TipTap errors
                note = sanitizeNoteContent(note);
                notes.push(note);
            } catch (error) {
                console.error(`Failed to parse note ${handle.name}:`, error);
            }
        }

        return notes.sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    async saveNote(note: Note): Promise<void> {
        if (!this.handle) {
            throw new Error('File system not connected');
        }

        const filename = this.getFilenameForNote(note);
        const fileHandle = await this.handle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();

        const content = this.serializeNote(note);
        await writable.write(content);
        await writable.close();
    }

    async updateNote(note: Note): Promise<void> {
        // For file system, update is the same as save (overwrites file)
        await this.saveNote(note);
    }

    async deleteNote(noteId: string): Promise<void> {
        if (!this.handle) {
            throw new Error('File system not connected');
        }

        // Find the file for this note
        const notes = await this.getNotes();
        const note = notes.find(n => n.id === noteId);

        if (note) {
            const filename = this.getFilenameForNote(note);
            try {
                await this.handle.removeEntry(filename);
            } catch (error) {
                console.error(`Failed to delete file ${filename}:`, error);
                throw error;
            }
        }
    }

    async saveAllNotes(notes: Note[]): Promise<void> {
        // Save each note as individual file
        for (const note of notes) {
            await this.saveNote(note);
        }
    }

    exportNotes(notes: Note[]): string {
        return JSON.stringify(notes, null, 2);
    }

    importNotes(data: string): Note[] {
        try {
            const parsed = JSON.parse(data);
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
        } catch (_error) {
            throw new Error('Invalid notes file format');
        }
    }

    async clear(): Promise<void> {
        if (!this.handle) return;

        // Delete all .md files in the directory
        for await (const entry of this.handle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                await this.handle.removeEntry(entry.name);
            }
        }
    }

    // Private helper methods

    private getFilenameForNote(note: Note): string {
        const sanitizedTitle = note.title
            .replace(/[/\\?%*:|"<>]/g, '-')
            .substring(0, 100);
        return `${sanitizedTitle}.md`;
    }

    private parseNoteFile(content: string, filename: string, _path: string): Note {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);

        const metadata: Record<string, string> = {};
        let body = content;

        if (match) {
            const frontmatter = match[1];
            body = match[2];

            frontmatter.split('\n').forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    metadata[key] = value;
                }
            });
        }

        return {
            id: metadata.id || nanoid(),
            title: metadata.title || filename.replace('.md', ''),
            content: this.markdownToProseMirror(body),
            createdAt: metadata.createdAt || new Date().toISOString(),
            updatedAt: metadata.updatedAt || new Date().toISOString(),
            tags: metadata.tags ? metadata.tags.split(',').map((t: string) => ({
                id: nanoid(),
                name: t.trim(),
                color: 'gray' as const,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })) : [],
        };
    }

    private serializeNote(note: Note): string {
        const frontmatter = [
            '---',
            `id: ${note.id}`,
            `title: ${note.title}`,
            `createdAt: ${note.createdAt}`,
            `updatedAt: ${note.updatedAt}`,
            (note.tags && note.tags.length > 0) ? `tags: ${note.tags.map(t => t.name).join(', ')}` : '',
            '---'
        ].filter(Boolean).join('\n');

        const body = this.proseMirrorToMarkdown(note.content);
        return frontmatter + '\n' + body;
    }

    private markdownToProseMirror(markdown: string): JSONContent {
        return parseMarkdown(markdown);
    }

    private proseMirrorToMarkdown(content: JSONContent): string {
        return serializeToMarkdown(content);
    }
}

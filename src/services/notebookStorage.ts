import type { JupyterOutput } from '../types/notebook';

const DB_NAME = 'sandbooks-notebooks';
const DB_VERSION = 1;
const STORE_NAME = 'outputs';

/**
 * IndexedDB storage service for notebook outputs
 * Stores large outputs separately from localStorage to avoid size limits
 */
class NotebookStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  private async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create outputs store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });

    await this.initPromise;
  }

  /**
   * Store outputs for a code block
   */
  async storeOutputs(noteId: string, blockId: string, outputs: JupyterOutput[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const key = `${noteId}:${blockId}`;

      const request = store.put(outputs, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get outputs for a code block
   */
  async getOutputs(noteId: string, blockId: string): Promise<JupyterOutput[] | null> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const key = `${noteId}:${blockId}`;

      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete outputs for a code block
   */
  async deleteOutputs(noteId: string, blockId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const key = `${noteId}:${blockId}`;

      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete all outputs for a note
   */
  async deleteNoteOutputs(noteId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Get all keys
      const getAllKeysRequest = store.getAllKeys();

      getAllKeysRequest.onsuccess = () => {
        const keys = getAllKeysRequest.result;
        const noteKeys = keys.filter(key =>
          typeof key === 'string' && key.startsWith(`${noteId}:`)
        );

        let deletedCount = 0;
        const totalToDelete = noteKeys.length;

        if (totalToDelete === 0) {
          resolve();
          return;
        }

        noteKeys.forEach(key => {
          const deleteRequest = store.delete(key);
          deleteRequest.onsuccess = () => {
            deletedCount++;
            if (deletedCount === totalToDelete) {
              resolve();
            }
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
      };

      getAllKeysRequest.onerror = () => reject(getAllKeysRequest.error);
    });
  }

  /**
   * Clear all stored outputs
   */
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const notebookStorage = new NotebookStorage();

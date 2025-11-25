import type { ExecuteCellResponse } from '../types/notebook';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Execute a code cell in a notebook with stateful execution
 */
export async function executeCell(noteId: string, code: string): Promise<ExecuteCellResponse> {
  const response = await fetch(`${API_URL}/api/notebooks/${noteId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Execution failed' }));
    throw new Error(error.message || 'Failed to execute cell');
  }

  return response.json();
}

/**
 * Restart the kernel for a notebook (clears execution count, keeps sandbox)
 */
export async function restartKernel(noteId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/notebooks/${noteId}/restart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to restart kernel');
  }
}

/**
 * Destroy the kernel session for a notebook
 */
export async function destroySession(noteId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/notebooks/${noteId}/session`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to destroy session');
  }
}

/**
 * Get kernel session status
 */
export async function getSessionStatus(noteId: string): Promise<{
  noteId: string;
  sandboxId: string;
  executionCount: number;
  status: string;
  createdAt: string;
  lastActivity: string;
}> {
  const response = await fetch(`${API_URL}/api/notebooks/${noteId}/session`);

  if (!response.ok) {
    throw new Error('Failed to get session status');
  }

  return response.json();
}

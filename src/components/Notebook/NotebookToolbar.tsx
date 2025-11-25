import React from 'react';
import { showToast as toast } from '../../utils/toast';
import { restartKernel } from '../../services/notebook';
import { convertNoteToIpynb, downloadFile } from '../../utils/ipynb';
import type { Note } from '../../types';

interface NotebookToolbarProps {
  note: Note;
  onRunAll: () => void;
  onClearAllOutputs: () => void;
}

export const NotebookToolbar: React.FC<NotebookToolbarProps> = ({
  note,
  onRunAll,
  onClearAllOutputs
}) => {
  const handleRestartKernel = async () => {
    try {
      toast.loading('Restarting kernel...', { id: 'restart-kernel' });
      await restartKernel(note.id);
      onClearAllOutputs();
      toast.success('Kernel restarted', { id: 'restart-kernel' });
    } catch (error) {
      toast.error(
        `Failed to restart: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id: 'restart-kernel' }
      );
    }
  };

  const handleExport = () => {
    try {
      const ipynb = convertNoteToIpynb(note);
      const filename = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ipynb`;
      downloadFile(ipynb, filename, 'application/json');
      toast.success('Notebook exported', { duration: 3000 });
    } catch (error) {
      toast.error(
        `Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  return (
    <div className="notebook-toolbar flex items-center gap-2 p-2 bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
      <button
        onClick={onRunAll}
        className="px-3 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors flex items-center gap-1.5"
        title="Run all cells in order"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg className="w-4 h-4 -ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline">Run All</span>
      </button>

      <button
        onClick={onClearAllOutputs}
        className="px-3 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors flex items-center gap-1.5"
        title="Clear all outputs"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span className="hidden sm:inline">Clear</span>
      </button>

      <button
        onClick={handleRestartKernel}
        className="px-3 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors flex items-center gap-1.5"
        title="Restart kernel (clears all variables)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="hidden sm:inline">Restart</span>
      </button>

      <div className="flex-1" />

      <button
        onClick={handleExport}
        className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center gap-1.5"
        title="Export to Jupyter notebook (.ipynb)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="hidden sm:inline">Export .ipynb</span>
      </button>
    </div>
  );
};

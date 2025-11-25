import React from 'react';
import { useNotesStore } from '../store/notesStore';
import { LuFolderOpen, LuUnlink } from 'react-icons/lu';

export const FileSystemSync: React.FC = () => {
    const { connectToLocalFolder, disconnectFromLocalFolder, storageType, storageName } = useNotesStore();

    // Show connected state when using file system
    if (storageType === 'fileSystem') {
        return (
            <div className="flex items-center gap-3 px-3 py-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <LuFolderOpen className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1" title={storageName}>
                    {storageName}
                </span>
                <button
                    onClick={disconnectFromLocalFolder}
                    className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                    title="Switch back to browser storage"
                >
                    <LuUnlink className="w-4 h-4" />
                </button>
            </div>
        );
    }

    // Show connect button when in localStorage mode
    return (
        <button
            onClick={connectToLocalFolder}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200 transition-colors rounded-lg"
            title="Connect to a local folder - notes will be saved as markdown files"
        >
            <LuFolderOpen className="w-4 h-4 shrink-0" />
            <span>Open Folder</span>
        </button>
    );
};

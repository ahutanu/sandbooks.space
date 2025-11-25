import { useState, useRef, useEffect } from 'react';
import { useNotesStore } from '../../store/notesStore';
import clsx from 'clsx';
import { LuDownload, LuUpload, LuRefreshCw, LuCircleAlert, LuCheck, LuCloud, LuHardDrive, LuFileJson, LuFileCode, LuFileText } from 'react-icons/lu';
import { FileSystemSync } from '../FileSystemSync';
import { showToast as toast } from '../../utils/toast';
import { parseIpynb, convertIpynbToNote } from '../../utils/ipynb';
import { serializeToMarkdown } from '../../utils/markdownSerializer';
import { Popover } from './Popover';
import { Button } from './Button';

export const SyncStatusIcon = () => {
    const { syncStatus, lastSyncedAt, importNotes, exportNotes, notes, storageType, storageName, addNote } = useNotesStore();
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const notebookInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleExport = () => {
        const data = exportNotes();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sandbooks-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsOpen(false);
    };



    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result as string;
                importNotes(data);
                toast.success('Notes imported successfully!');
                setIsOpen(false);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Import failed');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleImportNotebook = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            toast.loading('Importing notebook...', { id: 'import' });
            const notebook = await parseIpynb(file);
            const note = convertIpynbToNote(notebook, file.name);
            addNote(note);
            toast.success(`Imported ${note.title}`, { id: 'import' });
            setIsOpen(false);
        } catch (error) {
            toast.error(
                `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { id: 'import' }
            );
        }

        // Reset input
        if (notebookInputRef.current) {
            notebookInputRef.current.value = '';
        }
    };

    const getIcon = () => {
        switch (syncStatus) {
            case 'saving':
                return (
                    <div className="relative">
                        <LuRefreshCw className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
                        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-white dark:border-stone-900" />
                    </div>
                );
            case 'disconnected':
            case 'error':
                return (
                    <div className="relative">
                        <LuCircleAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-stone-900">
                            <span className="text-[8px] font-bold text-white">!</span>
                        </div>
                    </div>
                );
            case 'synced':
            default:
                return (
                    <div className="relative">
                        <LuCloud className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                        <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-stone-900">
                            <LuCheck className="w-2 h-2 text-white" strokeWidth={4} />
                        </div>
                    </div>
                );
        }
    };

    const getStatusText = () => {
        switch (syncStatus) {
            case 'saving': return 'Saving...';
            case 'disconnected': return 'Disconnected';
            case 'error': return 'Sync Error';
            case 'synced': return 'Up to date';
            default: return 'Unknown';
        }
    };

    return (
        <Popover
            align="right"
            trigger={
                <Button
                    variant="ghost"
                    size="icon"
                    className={clsx(isOpen && "bg-stone-100 dark:bg-stone-800")}
                    aria-label={`Sync status: ${getStatusText()}`}
                >
                    {getIcon()}
                </Button>
            }
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            content={
                <div className="w-72 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-stone-900 dark:text-stone-100">Sync Status</span>
                        <span className={clsx(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            syncStatus === 'synced' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                            syncStatus === 'saving' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                            (syncStatus === 'disconnected' || syncStatus === 'error') && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                            {getStatusText()}
                        </span>
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400 mb-4 space-y-1">
                        <div>
                            {lastSyncedAt
                                ? `Last synced: ${new Date(lastSyncedAt).toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                })}`
                                : 'Not synced yet'}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span>Synced to:</span>
                            <span className={clsx(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium max-w-[180px]",
                                storageType === 'fileSystem'
                                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700"
                            )}>
                                {storageType === 'fileSystem' ? (
                                    <LuHardDrive className="w-3 h-3 shrink-0" />
                                ) : (
                                    <LuCloud className="w-3 h-3 shrink-0" />
                                )}
                                <span className="truncate">{storageName}</span>
                            </span>
                        </div>
                    </div>

                    <div className="h-px bg-stone-200 dark:bg-stone-800 my-3" />

                    <div className="space-y-0.5">
                        {/* Export Notes */}
                        <button
                            onClick={() => { handleExport(); setIsOpen(false); }}
                            disabled={notes.length === 0}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
                        >
                            <LuDownload className="w-4 h-4 shrink-0" />
                            <span>Export Notes</span>
                        </button>

                        {/* Import from JSON */}
                        <label className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200 transition-colors rounded-lg cursor-pointer">
                            <LuUpload className="w-4 h-4 shrink-0" />
                            <span>Import from JSON</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImportFile}
                                className="hidden"
                            />
                        </label>

                        {/* Import Jupyter Notebook */}
                        <label className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200 transition-colors rounded-lg cursor-pointer">
                            <LuFileCode className="w-4 h-4 shrink-0" />
                            <span>Import Jupyter Notebook</span>
                            <input
                                ref={notebookInputRef}
                                type="file"
                                accept=".ipynb"
                                onChange={handleImportNotebook}
                                className="hidden"
                            />
                        </label>

                        <div className="h-px bg-stone-200 dark:bg-stone-800 my-2" />

                        {/* Export Current as Markdown */}
                        <button
                            onClick={() => {
                                const activeNote = notes.find(n => n.id === useNotesStore.getState().activeNoteId);
                                if (activeNote) {
                                    const md = serializeToMarkdown(activeNote.content);
                                    const blob = new Blob([md], { type: 'text/markdown' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${activeNote.title || 'untitled'}.md`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    setIsOpen(false);
                                    toast.success('Note exported as Markdown');
                                } else {
                                    toast.error('No active note to export');
                                }
                            }}
                            disabled={!useNotesStore.getState().activeNoteId}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
                        >
                            <LuFileText className="w-4 h-4 shrink-0" />
                            <span>Export Current (Markdown)</span>
                        </button>

                        {/* Import Markdown */}
                        <label className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200 transition-colors rounded-lg cursor-pointer">
                            <LuFileJson className="w-4 h-4 shrink-0" />
                            <span>Import Markdown</span>
                            <input
                                type="file"
                                accept=".md,.markdown,.txt"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file) {
                                        useNotesStore.getState().importMarkdownNote(file);
                                    }
                                    setIsOpen(false);
                                    e.target.value = '';
                                }}
                                className="hidden"
                            />
                        </label>

                        <div className="h-px bg-stone-200 dark:bg-stone-800 my-2" />

                        {/* File System Sync */}
                        <FileSystemSync />
                    </div>
                </div>
            }
        />
    );
};


import { useNotesStore, createNewNote } from '../../store/notesStore';
import toast from 'react-hot-toast';
import { useRef } from 'react';
import clsx from 'clsx';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header = ({ onToggleMobileSidebar }: HeaderProps) => {
  const { notes, addNote, importNotes, exportNotes, activeNoteId, cloudExecutionEnabled, toggleCloudExecution, darkModeEnabled, toggleDarkMode, isSidebarOpen, toggleSidebar, isCreatingSandbox, isTerminalOpen, toggleTerminal } = useNotesStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleNewNote = () => {
    const newNote = createNewNote();
    addNote(newNote);
  };

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
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
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
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Import failed');
      }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-3 md:px-6 lg:px-8 py-3 md:py-4 lg:py-6 flex items-center justify-between shadow-elevation-1" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      <div className="flex items-center gap-4 md:gap-6">
        {/* Mobile hamburger menu */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98]"
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <svg className="w-6 h-6 text-stone-700 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden md:block p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98]"
          title={isSidebarOpen ? "Hide sidebar (⌘B)" : "Show sidebar (⌘B)"}
          aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isSidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            )}
          </svg>
        </button>

        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold text-stone-900 dark:text-stone-50 tracking-tight">
            Sandbooks
          </h1>
          <span className="hidden sm:inline text-sm font-medium text-stone-600 dark:text-stone-400 tracking-wide">
            dev notes
          </span>
        </div>
        {activeNote && (
          <span className="hidden sm:inline text-sm text-stone-500 dark:text-stone-400 ml-3 pl-3 border-l border-stone-300 dark:border-stone-700">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
        <button
          onClick={toggleDarkMode}
          className={clsx(
            "p-1.5 md:p-2 lg:p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 group focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98]"
          )}
          title={darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"}
        >
          <svg
            className={clsx(
              "w-5 h-5 transition-all duration-300 ease-out",
              darkModeEnabled ? "text-stone-300 rotate-180" : "text-stone-700 rotate-0"
            )}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            {/* Half-filled circle (circle.lefthalf.filled) */}
            <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.15" />
            <path d="M12 3 A 9 9 0 0 1 12 21 Z" fill="currentColor" />
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          </svg>
        </button>
        <button
          onClick={toggleCloudExecution}
          disabled={isCreatingSandbox}
          className={clsx(
            "flex p-1.5 md:p-2 lg:p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 relative group focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98]",
            isCreatingSandbox && "opacity-50 cursor-not-allowed"
          )}
          title={
            isCreatingSandbox
              ? "Creating sandbox..."
              : cloudExecutionEnabled
              ? "Cloud execution enabled"
              : "Cloud execution disabled"
          }
          aria-label={
            isCreatingSandbox
              ? "Creating sandbox"
              : cloudExecutionEnabled
              ? "Disable cloud execution"
              : "Enable cloud execution"
          }
        >
          {isCreatingSandbox ? (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6" />
              </svg>
              {!cloudExecutionEnabled && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-6 h-0.5 bg-red-500 rotate-45"></div>
                </div>
              )}
            </>
          )}
        </button>
        <button
          onClick={toggleTerminal}
          disabled={!activeNoteId}
          className={clsx(
            "flex p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 group focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98] min-w-[44px] min-h-[44px] items-center justify-center",
            isTerminalOpen && "bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-400/30",
            !activeNoteId && "opacity-40 cursor-not-allowed"
          )}
          title={isTerminalOpen ? "Close terminal (Ctrl+`)" : "Open terminal (Ctrl+`)"}
          aria-label={isTerminalOpen ? "Close terminal" : "Open terminal"}
        >
          <svg
            className={clsx(
              "w-5 h-5 transition-colors duration-200",
              isTerminalOpen
                ? "text-blue-600 dark:text-blue-400"
                : "text-stone-600 dark:text-stone-400"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
        <div className="hidden md:block w-px h-6 bg-stone-300 dark:bg-stone-700"></div>
        <button
          onClick={handleNewNote}
          className="p-1.5 md:p-2 lg:p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 group focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98]"
          title="New note (⌘N)"
          aria-label="Create new note"
        >
          <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={handleExport}
          disabled={notes.length === 0}
          className="hidden md:flex p-1.5 md:p-2 lg:p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98] disabled:active:scale-100"
          title="Export notes"
          aria-label="Export all notes"
        >
          <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <button
          onClick={handleImportClick}
          className="hidden md:flex p-1.5 md:p-2 lg:p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 group focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98]"
          title="Import notes"
          aria-label="Import notes from file"
        >
          <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
    </header>
  );
};

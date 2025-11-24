import { useNotesStore, createNewNote } from '../../store/notesStore';
import clsx from 'clsx';
import { Logo } from './Logo';
import { SyncStatusIcon } from './SyncStatusIcon';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header = ({ onToggleMobileSidebar }: HeaderProps) => {
  const { notes, activeNoteId, executionMode, setExecutionMode, localExecutionAvailable, darkModeEnabled, toggleDarkMode, isSidebarOpen, toggleSidebar, isCreatingSandbox, isTerminalOpen, toggleTerminal, addNote } = useNotesStore();
  
  // Handle execution mode toggle
  const handleExecutionModeToggle = async () => {
    const newMode = executionMode === 'cloud' ? 'local' : 'cloud';
    await setExecutionMode(newMode);
  };
  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleNewNote = () => {
    const newNote = createNewNote();
    addNote(newNote);
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-6 flex items-center justify-between shadow-elevation-1 transition-all duration-200" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      <div className="flex items-center gap-4 md:gap-6">
        {/* Mobile hamburger menu */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 -ml-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98] touch-manipulation"
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

        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8 text-stone-900 dark:text-stone-50" />
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
          onClick={handleExecutionModeToggle}
          disabled={executionMode === 'local' && !localExecutionAvailable}
          className={clsx(
            "p-1.5 md:p-2 lg:p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 group focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98]",
            isCreatingSandbox && "opacity-80",
            executionMode === 'local' && !localExecutionAvailable && "opacity-50 cursor-not-allowed"
          )}
          data-testid="execution-toggle"
          title={
            isCreatingSandbox
              ? "Creating sandbox..."
              : executionMode === 'cloud'
                ? "Cloud execution enabled - Click to switch to local"
                : localExecutionAvailable
                  ? "Local execution enabled - Click to switch to cloud"
                  : "Local execution not available on this platform"
          }
          aria-label={
            isCreatingSandbox
              ? "Cancel sandbox creation"
              : executionMode === 'cloud'
                ? "Switch to local execution"
                : "Switch to cloud execution"
          }
        >
          {isCreatingSandbox ? (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {executionMode === 'cloud' ? (
                <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </>
          )}
        </button>
        <button
          onClick={toggleTerminal}
          className={clsx(
            "flex p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 group focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98] min-w-[44px] min-h-[44px] items-center justify-center",
            isTerminalOpen && "bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-400/30"
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

        <div className="hidden md:block w-px h-6 bg-stone-300 dark:bg-stone-700"></div>

        <SyncStatusIcon />
      </div>
    </header>
  );
};

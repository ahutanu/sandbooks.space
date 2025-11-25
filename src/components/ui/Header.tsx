import { useNotesStore, createNewNote } from '../../store/notesStore';
import clsx from 'clsx';
import { Logo } from './Logo';
import { SyncStatusIcon } from './SyncStatusIcon';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { LuMenu, LuPanelLeftClose, LuPanelLeftOpen, LuMoon, LuSun, LuTerminal, LuPlus } from 'react-icons/lu';


interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header = ({ onToggleMobileSidebar }: HeaderProps) => {
  const { notes, activeNoteId, darkModeEnabled, toggleDarkMode, isSidebarOpen, toggleSidebar, isTerminalOpen, toggleTerminal, addNote } = useNotesStore();

  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleNewNote = () => {
    const newNote = createNewNote();
    addNote(newNote);
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-6 flex items-center justify-between shadow-elevation-1 transition-all duration-200" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      <div className="flex items-center gap-4 md:gap-6">
        {/* Mobile hamburger menu */}
        <div className="md:hidden -ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle sidebar"
          >
            <LuMenu className="w-6 h-6 text-stone-700 dark:text-stone-300" />
          </Button>
        </div>

        {/* Desktop sidebar toggle */}
        <div className="hidden md:block">
          <Tooltip content={isSidebarOpen ? "Hide sidebar" : "Show sidebar"} shortcut="⌘B">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {isSidebarOpen ? (
                <LuPanelLeftClose className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              ) : (
                <LuPanelLeftOpen className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              )}
            </Button>
          </Tooltip>
        </div>

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
        <Tooltip content={darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            aria-label={darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkModeEnabled ? (
              <LuSun className="w-5 h-5 text-stone-300" />
            ) : (
              <LuMoon className="w-5 h-5 text-stone-700" />
            )}
          </Button>
        </Tooltip>

        <Tooltip content={isTerminalOpen ? "Close terminal" : "Open terminal"} shortcut="Ctrl+`">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTerminal}
            className={clsx(
              isTerminalOpen && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            )}
            aria-label={isTerminalOpen ? "Close terminal" : "Open terminal"}
          >
            <LuTerminal
              className={clsx(
                "w-5 h-5 transition-colors duration-200",
                isTerminalOpen
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-stone-600 dark:text-stone-400"
              )}
            />
          </Button>
        </Tooltip>

        <div className="hidden md:block w-px h-6 bg-stone-300 dark:bg-stone-700"></div>

        <Tooltip content="New note" shortcut="⌘N">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewNote}
            aria-label="Create new note"
          >
            <LuPlus className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </Button>
        </Tooltip>

        <div className="hidden md:block w-px h-6 bg-stone-300 dark:bg-stone-700"></div>

        <SyncStatusIcon />
      </div>
    </header>
  );
};

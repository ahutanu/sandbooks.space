import { useNotesStore, createNewNote } from '../../store/notesStore';
import clsx from 'clsx';
import { Logo } from './Logo';
import { SyncStatusIcon } from './SyncStatusIcon';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { GitHubConnect } from '../GitHub';
import { LuMenu, LuPanelLeftClose, LuPanelLeftOpen, LuMoon, LuSun, LuTerminal, LuPlus, LuShare2 } from 'react-icons/lu';


interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header = ({ onToggleMobileSidebar }: HeaderProps) => {
  const { notes, activeNoteId, darkModeEnabled, toggleDarkMode, isSidebarOpen, toggleSidebar, isTerminalOpen, toggleTerminal, addNote, setShareModalOpen } = useNotesStore();

  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleNewNote = () => {
    const newNote = createNewNote();
    addNote(newNote);
  };

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 px-3 md:px-4 py-2 flex items-center justify-between transition-all duration-200",
        // Glass morphism
        "bg-white/90 dark:bg-stone-900/90",
        "backdrop-blur-xl",
        "border-b border-stone-200/40 dark:border-stone-700/40",
        // Inner highlight for glass depth
        "shadow-[inset_0_-1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.05)]",
        "dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.03),0_1px_2px_rgba(0,0,0,0.2)]"
      )}
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      {/* Left section: Sidebar toggle + Logo + Title */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Mobile hamburger menu */}
        <div className="md:hidden flex-shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle sidebar"
          >
            <LuMenu className="w-5 h-5 text-stone-700 dark:text-stone-300" />
          </Button>
        </div>

        {/* Desktop sidebar toggle */}
        <div className="hidden md:block flex-shrink-0">
          <Tooltip content={isSidebarOpen ? "Hide sidebar" : "Show sidebar"} shortcut="⌘B">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {isSidebarOpen ? (
                <LuPanelLeftClose className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              ) : (
                <LuPanelLeftOpen className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              )}
            </Button>
          </Tooltip>
        </div>

        {/* Logo + Title - compact layout */}
        <div className="flex items-center gap-2 min-w-0">
          <Logo className="w-6 h-6 md:w-7 md:h-7 text-stone-900 dark:text-stone-50 flex-shrink-0" />
          <h1 className="text-lg md:text-xl font-semibold text-stone-900 dark:text-stone-50 tracking-tight truncate">
            Sandbooks
          </h1>
          <StatusBadge className="hidden sm:inline-flex" />
        </div>
      </div>

      {/* Right section: Controls */}
      <div className="flex items-center gap-1">
        <Tooltip content={darkModeEnabled ? "Light mode" : "Dark mode"}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleDarkMode}
            aria-label={darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkModeEnabled ? (
              <LuSun className="w-4 h-4 text-stone-300" />
            ) : (
              <LuMoon className="w-4 h-4 text-stone-600" />
            )}
          </Button>
        </Tooltip>

        <GitHubConnect />

        <Tooltip content={isTerminalOpen ? "Close terminal" : "Terminal"} shortcut="⌘`">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTerminal}
            className={clsx(
              isTerminalOpen && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            )}
            aria-label={isTerminalOpen ? "Close terminal" : "Open terminal"}
          >
            <LuTerminal
              className={clsx(
                "w-4 h-4 transition-colors duration-200",
                isTerminalOpen
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-stone-600 dark:text-stone-400"
              )}
            />
          </Button>
        </Tooltip>

        <div className="w-px h-5 bg-stone-200 dark:bg-stone-700 mx-0.5 hidden sm:block" />

        <Tooltip content="New note" shortcut="⌘N">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewNote}
            aria-label="Create new note"
          >
            <LuPlus className="w-4 h-4 text-stone-600 dark:text-stone-400" />
          </Button>
        </Tooltip>

        {activeNote && (
          <Tooltip content="Share" shortcut="⌘⇧S">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShareModalOpen(true)}
              aria-label="Share note"
              className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <LuShare2 className="w-4 h-4" />
            </Button>
          </Tooltip>
        )}

        <div className="w-px h-5 bg-stone-200 dark:bg-stone-700 mx-0.5 hidden sm:block" />

        <SyncStatusIcon />
      </div>
    </header>
  );
};

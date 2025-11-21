import { useEffect, useState, lazy, Suspense } from 'react';
import { useNotesStore, createNewNote } from './store/notesStore';
import { Header } from './components/ui/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Editor } from './components/Editor/Editor';
import { EditorModeIndicator } from './components/ui/EditorModeIndicator';
import type { JSONContent } from '@tiptap/react';

// Lazy load on-demand components for better performance
const SearchBar = lazy(() => import('./components/Search/SearchBar').then(m => ({ default: m.SearchBar })));
const KeyboardShortcuts = lazy(() => import('./components/Help/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts })));
const QuakeTerminal = lazy(() => import('./components/Terminal').then(m => ({ default: m.QuakeTerminal })));

function App() {
  const {
    notes,
    activeNoteId,
    addNote,
    updateNote,
    setActiveNote,
    openSearch,
    toggleShortcuts,
    toggleSidebar,
    toggleTypewriterMode,
    toggleFocusMode,
    initializeGlobalTerminalSession,
    autoHealSandbox,
  } = useNotesStore();
  const seedDocsIfMissing = useNotesStore((state) => state.seedDocsIfMissing);
  const activeNote = notes.find((n) => n.id === activeNoteId);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const apiToken = import.meta.env.VITE_API_TOKEN as string | undefined;

  // Initialize global terminal session on mount + health check
  useEffect(() => {
    // Initialize terminal session immediately
    initializeGlobalTerminalSession();

    // Health check interval (every 30s) - auto-recreate on failure
    const healthCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/health`, {
          headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined,
        });
        if (!response.ok) {
          await initializeGlobalTerminalSession();
        }
      } catch (_error) {
        await initializeGlobalTerminalSession();
      }
    }, 30000); // 30 seconds

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [apiBaseUrl, apiToken, initializeGlobalTerminalSession]);

  // Silently ensure sandbox is healthy on load, tab focus, and background intervals
  useEffect(() => {
    const heal = async (reason: string, force?: boolean) => {
      try {
        await autoHealSandbox({ reason, force });
      } catch (_error) {
        // Silent failure - fallback execution path will still retry
      }
    };

    // Kick off heal on initial mount
    heal('app_start', true);

    // Heal when returning to the tab
    const handleVisibility = () => {
      if (!document.hidden) {
        heal('visibility');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Background heartbeat to keep sandboxes ahead of expiry
    const healInterval = window.setInterval(() => heal('interval'), 10 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(healInterval);
    };
  }, [autoHealSandbox]);

  // Reinstall living docs if local storage is empty
  useEffect(() => {
    if (notes.length === 0) {
      seedDocsIfMissing();
    }
  }, [notes.length, seedDocsIfMissing]);

  // Auto-select first note if none selected
  useEffect(() => {
    if (notes.length > 0 && !activeNoteId) {
      setActiveNote(notes[0].id);
    }
  }, [notes, activeNoteId, setActiveNote]);

  const handleContentUpdate = (content: JSONContent) => {
    if (activeNote) {
      updateNote(activeNote.id, { content });
    }
  };

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  // Close mobile sidebar when note changes (mobile UX pattern)
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    closeMobileSidebar();
  }, [activeNoteId, isMobileSidebarOpen]);

  // Global keyboard shortcuts (Gmail/Linear pattern: context-sensitive, cross-platform)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) ||
                       target.contentEditable === 'true' ||
                       target.classList.contains('ProseMirror');

      // Context-sensitive shortcuts (only when NOT typing in editor)
      if (!isTyping) {
        // ? - Show keyboard shortcuts (Gmail/Linear pattern, safest)
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleShortcuts();
          return;
        }

        // / - Open search (Slack/Figma pattern, safe)
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          openSearch();
          return;
        }

        // c - Create new note (Gmail pattern, safe)
        if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const newNote = createNewNote();
          addNote(newNote);
          return;
        }
      }

      // Global shortcuts (work even when typing)
      const modifier = e.ctrlKey || e.metaKey;

      // Cmd+B / Ctrl+B: Toggle sidebar (industry standard)
      if (modifier && e.key === 'b' && !e.shiftKey) {
        // Only activate if NOT in the TipTap editor (let TipTap handle bold)
        if (!target.classList.contains('ProseMirror')) {
          e.preventDefault();
          toggleSidebar();
          return;
        }
      }

      // Cmd+K / Ctrl+K: Command palette/Search (industry standard, but check if in editor)
      if (modifier && e.key === 'k' && !e.shiftKey) {
        // Only activate if NOT in the TipTap editor (let TipTap handle link insertion)
        if (!target.classList.contains('ProseMirror')) {
          e.preventDefault();
          openSearch();
          return;
        }
      }

      // Cmd+Shift+T / Ctrl+Shift+T: Toggle typewriter mode (iA Writer pattern)
      if (modifier && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTypewriterMode();
        return;
      }

      // Cmd+Shift+F / Ctrl+Shift+F: Toggle focus mode (FocusWriter/iA Writer pattern)
      if (modifier && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        toggleFocusMode();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSearch, toggleShortcuts, addNote, toggleSidebar, toggleTypewriterMode, toggleFocusMode]);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-stone-900">
      <Header onToggleMobileSidebar={toggleMobileSidebar} />
      <Suspense fallback={null}>
        <SearchBar />
        <KeyboardShortcuts />
        <QuakeTerminal />
      </Suspense>
      {/* Glass morphism editor mode indicator (bottom-right, contextual) */}
      <EditorModeIndicator />
      {/* Two-pane layout: Sidebar + Editor (industry-standard flex pattern) */}
      <div className="flex-1 flex overflow-hidden bg-white dark:bg-stone-900">
        {/* Desktop sidebar - independently scrollable */}
        <Sidebar />

        {/* Mobile sidebar overlay */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden animate-fadeIn">
            {/* Backdrop */}
            <div
              className="absolute inset-0 glass-backdrop transition-opacity duration-200"
              onClick={closeMobileSidebar}
            />
            {/* Sidebar */}
            <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] z-10 animate-slideInLeft bg-white dark:bg-stone-900 shadow-2xl">
              <Sidebar isMobile={true} />
            </div>
          </div>
        )}

        {/* Main editor pane - independently scrollable */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-stone-900">
          {activeNote ? (
            <Editor note={activeNote} onUpdate={handleContentUpdate} />
          ) : (
            <div className="flex-1 flex items-center justify-center overflow-y-auto">
              <div className="text-center">
                <div className="mb-8">
                  <svg className="w-16 h-16 mx-auto text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V7a2 2 0 012-2h6a2 2 0 012 2v2M7 7a2 2 0 012-2h6a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-lg text-stone-500 dark:text-stone-400 font-medium">Select a note or create a new one to get started</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

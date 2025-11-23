import { useEffect, useState, lazy, Suspense } from 'react';
import { useNotesStore } from './store/notesStore';
import { Header } from './components/ui/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Editor } from './components/Editor/Editor';
import { EditorModeIndicator } from './components/ui/EditorModeIndicator';
import { AnalyticsConsent } from './components/ui/AnalyticsConsent';
import type { JSONContent } from '@tiptap/react';

// Lazy load on-demand components for better performance
const SearchBar = lazy(() => import('./components/Search/SearchBar').then(m => ({ default: m.SearchBar })));
const KeyboardShortcuts = lazy(() => import('./components/Help/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts })));
const QuakeTerminal = lazy(() => import('./components/Terminal').then(m => ({ default: m.QuakeTerminal })));
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const {
    notes,
    activeNoteId,
    updateNote,
    setActiveNote,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]); // Only depend on activeNoteId, not isMobileSidebarOpen to avoid closing on open

  // Escape key always blurs focused elements, enabling shortcuts
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const target = document.activeElement as HTMLElement;
        if (target &&
          (['INPUT', 'TEXTAREA'].includes(target.tagName) ||
            target.contentEditable === 'true' ||
            target.classList.contains('ProseMirror'))) {
          target.blur();
        }
      }
    };

    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, []);

  // Global keyboard shortcuts
  useKeyboardShortcuts();

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
      {/* Analytics consent banner (minimal, non-intrusive) */}
      <AnalyticsConsent />
      {/* Two-pane layout: Sidebar + Editor (industry-standard flex pattern) */}
      <div className="flex-1 flex overflow-hidden bg-white dark:bg-stone-900">
        {/* Desktop sidebar - independently scrollable */}
        <Sidebar />

        {/* Mobile sidebar overlay */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            {/* Backdrop - glassmorphism for premium feel */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out animate-fadeIn"
              onClick={closeMobileSidebar}
              role="button"
              aria-label="Close sidebar"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  closeMobileSidebar();
                }
              }}
            />
            {/* Sidebar - full height with proper stacking and spring animation */}
            <div className="absolute left-0 top-0 bottom-0 w-full max-w-[85vw] sm:w-80 sm:max-w-none z-50 bg-white dark:bg-stone-900 shadow-2xl animate-slideInLeft">
              <Sidebar isMobile={true} onClose={closeMobileSidebar} />
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

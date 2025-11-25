import { useEffect } from 'react';
import { useNotesStore, createNewNote } from '../store/notesStore';
import { matchesShortcut } from '../utils/platform';
import { getShortcutById } from '../constants/shortcuts';

export const useKeyboardShortcuts = () => {
    const {
        addNote,
        openSearch,
        toggleShortcuts,
        toggleSidebar,
        toggleTypewriterMode,
        toggleFocusMode,
        toggleTerminal,
    } = useNotesStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. Global Safety Checks
            // ----------------------------------------------------------------
            const target = e.target as HTMLElement;
            const isTyping =
                ['INPUT', 'TEXTAREA'].includes(target.tagName) ||
                target.contentEditable === 'true' ||
                target.classList.contains('ProseMirror') ||
                target.classList.contains('xterm-helper-textarea');

            // Helper to check against centralized definitions
            const check = (id: string) => {
                const shortcut = getShortcutById(id);
                if (!shortcut) return false;
                // We construct the pattern string expected by matchesShortcut
                // e.g. ['mod', 'shift', 'k'] -> 'mod+shift+k'
                const pattern = shortcut.keys.join('+');
                return matchesShortcut(e, pattern);
            };

            // 2. Global Shortcuts (Work even when typing)
            // ----------------------------------------------------------------

            // Toggle Terminal
            if (check('TOGGLE_TERMINAL')) {
                e.preventDefault();
                e.stopPropagation(); // Aggressive stop
                toggleTerminal();
                return;
            }

            // 3. Context-Sensitive Shortcuts (Blocked when typing)
            // ----------------------------------------------------------------
            if (isTyping) {
                // Allow Escape to blur focus
                if (e.key === 'Escape') {
                    target.blur();
                }
                return;
            }

            // Show Shortcuts: ?
            // Note: '?' is a raw key in our config, so we check manually or add a specific check
            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                toggleShortcuts();
                return;
            }

            // Open Search: /
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                openSearch();
                return;
            }

            // New Note: Mod + Alt + N (Safe replacement for Cmd+N)
            if (check('NEW_NOTE_GLOBAL')) {
                e.preventDefault();
                const newNote = createNewNote();
                addNote(newNote);
                return;
            }

            // Also support 'c' for Gmail style (only when not typing)
            if (check('NEW_NOTE_GMAIL')) {
                e.preventDefault();
                const newNote = createNewNote();
                addNote(newNote);
                return;
            }

            // Toggle Sidebar: Mod + \
            if (check('TOGGLE_SIDEBAR')) {
                e.preventDefault();
                toggleSidebar();
                return;
            }

            // Search / Command Palette: Mod + K
            if (check('SEARCH_GLOBAL')) {
                e.preventDefault();
                e.stopPropagation();
                openSearch();
                return;
            }

            // Typewriter Mode: Mod + Alt + T
            if (check('TOGGLE_TYPEWRITER')) {
                e.preventDefault();
                toggleTypewriterMode();
                return;
            }

            // Focus Mode: Mod + Alt + F
            if (check('TOGGLE_FOCUS')) {
                e.preventDefault();
                toggleFocusMode();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        addNote,
        openSearch,
        toggleShortcuts,
        toggleSidebar,
        toggleTypewriterMode,
        toggleFocusMode,
        toggleTerminal,
    ]);
};

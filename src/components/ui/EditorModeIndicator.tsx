import { useNotesStore } from '../../store/notesStore';
import clsx from 'clsx';

/**
 * EditorModeIndicator - Modern glass morphism status indicator
 *
 * Design Philosophy:
 * - Tiny glass objects with simple shapes (Pills, not buttons)
 * - Appears contextually (only when modes are active)
 * - Bottom-right corner (mobile-inspired Control Center pattern)
 * - Subtle and non-intrusive
 * - Layered depth with translucency
 *
 * Interaction:
 * - Click to toggle mode directly
 * - Keyboard shortcuts still work (⌘⌥T, ⌘⌥F)
 * - Hover shows label
 * - No visual clutter when disabled
 */
export const EditorModeIndicator = () => {
  const { typewriterModeEnabled, focusModeEnabled, toggleTypewriterMode, toggleFocusMode } = useNotesStore();

  // Don't render anything if both modes are disabled
  if (!typewriterModeEnabled && !focusModeEnabled) {
    return null;
  }

  return (
    <div
      className="fixed bottom-14 right-4 md:bottom-6 md:right-6 z-30 flex flex-col md:flex-row items-end md:items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label={`Editor modes: ${typewriterModeEnabled ? 'Typewriter' : ''} ${focusModeEnabled ? 'Focus' : ''}`}
    >
      {/* Typewriter Mode Indicator */}
      {typewriterModeEnabled && (
        <button
          onClick={toggleTypewriterMode}
          className={clsx(
            // Glass morphism base
            'group relative overflow-hidden',
            'backdrop-blur-md backdrop-saturate-150',
            'bg-white/80 dark:bg-stone-900/80',
            'border border-stone-200/50 dark:border-stone-700/50',
            // Shape and size
            'rounded-full px-3 py-1.5',
            'flex items-center gap-1.5',
            // Elevation and depth
            'shadow-lg shadow-stone-900/10 dark:shadow-black/40',
            // Transitions
            'transition-all duration-300 ease-out',
            // Hover state
            'hover:scale-105 hover:shadow-xl',
            'hover:bg-white/90 dark:hover:bg-stone-900/90',
            'hover:border-blue-300/60 dark:hover:border-blue-500/60',
            // Focus state (accessibility)
            'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2',
            // Active state
            'active:scale-95',
            // GPU acceleration
            'will-change-transform'
          )}
          title="Typewriter mode active (⌘⌥T to toggle) - Keeps cursor centered while typing"
          aria-label="Typewriter mode active. Automatically scrolls to keep cursor centered vertically while typing. Click to disable."
        >
          {/* Gradient overlay for depth */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
            aria-hidden="true"
          />

          {/* Icon: Cursor centered in document */}
          <svg
            className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 relative z-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0l-4-4m4 4l4-4" />
            <line x1="8" y1="12" x2="16" y2="12" strokeWidth={2.5} strokeLinecap="round" />
          </svg>

          {/* Label */}
          <span className="text-xs font-medium text-stone-700 dark:text-stone-300 tracking-wide relative z-10">
            Typewriter
          </span>

          {/* Animated pulse (subtle) */}
          <div
            className="absolute inset-0 rounded-full bg-blue-400/20 dark:bg-blue-500/20 animate-pulse"
            aria-hidden="true"
            style={{ animationDuration: '3s' }}
          />
        </button>
      )}

      {/* Focus Mode Indicator */}
      {focusModeEnabled && (
        <button
          onClick={toggleFocusMode}
          className={clsx(
            // Glass morphism base
            'group relative overflow-hidden',
            'backdrop-blur-md backdrop-saturate-150',
            'bg-white/80 dark:bg-stone-900/80',
            'border border-stone-200/50 dark:border-stone-700/50',
            // Shape and size
            'rounded-full px-3 py-1.5',
            'flex items-center gap-1.5',
            // Elevation and depth
            'shadow-lg shadow-stone-900/10 dark:shadow-black/40',
            // Transitions
            'transition-all duration-300 ease-out',
            // Hover state
            'hover:scale-105 hover:shadow-xl',
            'hover:bg-white/90 dark:hover:bg-stone-900/90',
            'hover:border-purple-300/60 dark:hover:border-purple-500/60',
            // Focus state (accessibility)
            'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-600/50 focus-visible:ring-offset-2',
            // Active state
            'active:scale-95',
            // GPU acceleration
            'will-change-transform'
          )}
          title="Focus mode active (⌘⇧F to toggle)"
          aria-label="Focus mode active. Click to disable."
        >
          {/* Gradient overlay for depth */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
            aria-hidden="true"
          />

          {/* Icon: Target/focus circles */}
          <svg
            className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 relative z-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>

          {/* Label */}
          <span className="text-xs font-medium text-stone-700 dark:text-stone-300 tracking-wide relative z-10">
            Focus
          </span>

          {/* Animated pulse (subtle) */}
          <div
            className="absolute inset-0 rounded-full bg-purple-400/20 dark:bg-purple-500/20 animate-pulse"
            aria-hidden="true"
            style={{ animationDuration: '3s' }}
          />
        </button>
      )}
    </div>
  );
};

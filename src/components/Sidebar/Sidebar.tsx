import { useNotesStore } from '../../store/notesStore';
import { formatTimestamp } from '../../utils/formatTimestamp';
import clsx from 'clsx';
import { Logo } from '../ui/Logo';

export const Sidebar = ({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) => {
  const { notes, activeNoteId, isSidebarOpen, setActiveNote, deleteNote } = useNotesStore();

  const handleDelete = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    deleteNote(noteId);
  };

  // Mobile sidebar is always "open" when rendered (controlled by parent overlay)
  const isOpen = isMobile ? true : isSidebarOpen;

  if (notes.length === 0) {
    return (
      <div className={clsx(
        "bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 p-8 flex flex-col items-center justify-center self-stretch",
        isMobile ? "w-full h-full justify-center" : "hidden md:flex transition-[width] duration-300 ease-in-out",
        !isMobile && (isOpen ? "w-80" : "w-0 hidden")
      )}>
        <div className="text-center">
          <Logo className="w-16 h-16 mx-auto text-stone-300 dark:text-stone-600 mb-6" />
          <p className="text-sm font-medium text-stone-600 dark:text-stone-400 tracking-tight">No notes yet</p>
          <p className="text-xs text-stone-500 dark:text-stone-500 mt-2">Press <kbd className="font-mono bg-stone-100 dark:bg-stone-800 px-1 rounded">⌘N</kbd> to start writing</p>
        </div>
      </div>
    );
  }

  return (
    <aside className={clsx(
      "bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 overflow-y-auto flex-shrink-0",
      isMobile ? "w-full h-full" : "hidden md:block transition-[width,opacity] duration-300 ease-in-out",
      !isMobile && (isOpen ? "w-80" : "w-0 opacity-0")
    )}>
      <div className="pt-4 px-4 pb-8">
        {isMobile && (
          <div className="flex items-center justify-between mb-6 pl-2 pr-1">
            <div className="flex items-center gap-3">
              <Logo className="w-6 h-6 text-stone-900 dark:text-stone-100" />
              <span className="font-semibold text-lg text-stone-900 dark:text-stone-100 tracking-tight">Sandbooks</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {notes.map((note) => {
          const timestamp = formatTimestamp(note.updatedAt);

          return (
            <div
              key={note.id}
              className={clsx(
                'px-3 md:px-4 py-3.5 md:py-3.5 mb-1 mx-2 rounded-lg transition-all duration-200 ease-out group relative touch-manipulation',
                activeNoteId === note.id
                  ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                  : 'hover:bg-stone-50 dark:hover:bg-stone-800/40 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 active:bg-stone-100 dark:active:bg-stone-800/60'
              )}
            >
              {/* Active Indicator */}
              {activeNoteId === note.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-blue-600 rounded-r-full" />
              )}
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => setActiveNote(note.id)}
                  className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 rounded"
                  aria-label={`Select note: ${note.title}`}
                  aria-current={activeNoteId === note.id ? 'true' : 'false'}
                >
                  <h3 className={clsx(
                    'truncate text-sm font-medium leading-snug pl-2 tracking-tight',
                    activeNoteId === note.id
                      ? 'text-stone-900 dark:text-stone-100'
                      : 'text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-200'
                  )}>
                    {note.title}
                  </h3>
                  <time
                    dateTime={timestamp.datetime}
                    aria-label={`Last edited ${timestamp.absolute}`}
                    title={timestamp.absolute}
                    className="block text-xs mt-1 pl-2 text-stone-400 dark:text-stone-500"
                  >
                    {timestamp.relative}
                  </time>

                  {/* Tags - minimal text-only display */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1 md:gap-1.5 mt-1 md:mt-1.5 text-xs opacity-60">
                      {note.tags.slice(0, 3).map((tag, idx) => {
                        const colorMap: Record<string, string> = {
                          gray: '#78716c', red: '#ef4444', orange: '#f97316', amber: '#f59e0b',
                          yellow: '#eab308', green: '#22c55e', emerald: '#10b981', blue: '#3b82f6',
                          indigo: '#6366f1', purple: '#a855f7', pink: '#ec4899', rose: '#f43f5e',
                        };
                        return (
                          <span key={tag.id} className="inline-flex items-center gap-1">
                            <span
                              className="w-1 h-1 rounded-full"
                              style={{ backgroundColor: colorMap[tag.color] || '#3b82f6' }}
                            />
                            <span className="font-medium">{tag.name}</span>
                            {idx < Math.min(note.tags!.length, 3) - 1 && <span className="text-stone-400">·</span>}
                          </span>
                        );
                      })}
                      {note.tags.length > 3 && (
                        <span className="text-stone-500 dark:text-stone-500">+{note.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
                <button
                  onClick={(e) => handleDelete(e, note.id)}
                  className="opacity-100 md:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-stone-400 dark:text-stone-500 hover:text-red-600 dark:hover:text-red-400 transition-[opacity,color,background-color,transform] duration-200 flex-shrink-0 p-3 md:p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-red-600 focus-visible:ring-offset-3 focus-visible:opacity-100 active:scale-[0.95]"
                  title="Delete note"
                  aria-label={`Delete note: ${note.title}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

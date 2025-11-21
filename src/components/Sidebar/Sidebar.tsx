import { useNotesStore } from '../../store/notesStore';
import { formatTimestamp } from '../../utils/formatTimestamp';
import clsx from 'clsx';

export const Sidebar = ({ isMobile = false }: { isMobile?: boolean }) => {
  const { notes, activeNoteId, isSidebarOpen, setActiveNote, deleteNote } = useNotesStore();

  const handleDelete = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    deleteNote(noteId);
  };

  if (notes.length === 0) {
    return (
      <div className={clsx(
      "bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 p-8 flex-col items-center justify-center self-stretch transition-[width] duration-300 ease-in-out",
      isMobile ? "flex" : "hidden md:block",
      isSidebarOpen ? "w-80 flex" : "w-0 hidden"
    )}>
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-stone-300 dark:text-stone-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-stone-600 dark:text-stone-400">No notes yet</p>
          <p className="text-xs text-stone-500 dark:text-stone-500 mt-2">Click "+ New Note" to get started</p>
        </div>
      </div>
    );
  }

  return (
    <aside className={clsx(
      "bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 overflow-y-auto flex-shrink-0 transition-[width,opacity] duration-300 ease-in-out",
      isMobile ? "block" : "hidden md:block",
      isSidebarOpen ? "w-80" : "w-0 opacity-0"
    )}>
      <div className="pt-4 px-2 md:px-4 pb-8">
        {notes.map((note) => {
          const timestamp = formatTimestamp(note.updatedAt);

          return (
            <div
              key={note.id}
              className={clsx(
                'px-2 md:px-5 py-2 md:py-4 mb-2 rounded-xl transition-[transform,box-shadow,background-color] duration-300 ease-spring group relative shadow-elevation-1 hover:shadow-elevation-2 hover:-translate-y-0.5 hover:scale-[1.02]',
                activeNoteId === note.id
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 text-blue-900 dark:text-blue-100 font-semibold'
                  : 'bg-gradient-to-br from-stone-50 to-white dark:from-stone-800 dark:to-stone-900 hover:from-stone-100 hover:to-white dark:hover:from-stone-750 dark:hover:to-stone-850 text-stone-700 dark:text-stone-300'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => setActiveNote(note.id)}
                  className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 rounded"
                  aria-label={`Select note: ${note.title}`}
                  aria-current={activeNoteId === note.id ? 'true' : 'false'}
                >
                  <h3 className={clsx(
                    'truncate text-xs md:text-base leading-tight',
                    activeNoteId === note.id
                      ? 'text-blue-900 dark:text-blue-100 font-semibold'
                      : 'text-stone-900 dark:text-stone-50 font-medium'
                  )}>
                    {note.title}
                  </h3>
                  <time
                    dateTime={timestamp.datetime}
                    aria-label={`Last edited ${timestamp.absolute}`}
                    title={timestamp.absolute}
                    className={clsx(
                      'block text-[10px] md:text-xs mt-1 md:mt-2',
                      activeNoteId === note.id ? 'text-blue-600 dark:text-blue-300' : 'text-stone-500 dark:text-stone-400'
                    )}
                  >
                    {timestamp.relative}
                  </time>

                  {/* Tags - minimal text-only display */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1 md:gap-1.5 mt-1 md:mt-1.5 text-[10px] md:text-xs opacity-60">
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
                className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-stone-400 dark:text-stone-500 hover:text-red-600 dark:hover:text-red-400 transition-[opacity,color,background-color,transform] duration-200 flex-shrink-0 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-red-600 focus-visible:ring-offset-3 focus-visible:opacity-100 active:scale-[0.95]"
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

import clsx from 'clsx';
import { useNotesStore } from '../../store/notesStore';
import { Logo } from '../ui/Logo';
import { FolderTree } from './FolderTree';

export const Sidebar = ({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) => {
  const { notes, isSidebarOpen } = useNotesStore();

  // Mobile sidebar is always "open" when rendered (controlled by parent overlay)
  const isOpen = isMobile ? true : isSidebarOpen;

  if (notes.length === 0) {
    return (
      <div className={clsx(
        // Glass panel with depth
        "relative p-6 flex flex-col items-center justify-center self-stretch",
        "bg-white/90 dark:bg-stone-900/90 backdrop-blur-2xl",
        "border-r border-stone-200/40 dark:border-stone-700/40",
        "shadow-[inset_1px_1px_0_rgba(255,255,255,0.1),inset_-1px_-1px_0_rgba(0,0,0,0.02)]",
        "dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.03),inset_-1px_-1px_0_rgba(0,0,0,0.1)]",
        isMobile ? "w-full h-full justify-center" : "hidden md:flex transition-[width] duration-300 ease-in-out",
        !isMobile && (isOpen ? "w-64 lg:w-72" : "w-0 hidden")
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
    <aside aria-label="Notes sidebar" className={clsx(
      // Glass panel with depth
      "relative flex-shrink-0 flex flex-col",
      "bg-white/90 dark:bg-stone-900/90 backdrop-blur-2xl",
      "border-r border-stone-200/40 dark:border-stone-700/40",
      // Inner highlight for glass depth
      "shadow-[inset_1px_1px_0_rgba(255,255,255,0.1),inset_-1px_-1px_0_rgba(0,0,0,0.02)]",
      "dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.03),inset_-1px_-1px_0_rgba(0,0,0,0.1)]",
      isMobile ? "w-full h-full" : "hidden md:flex transition-[width,opacity] duration-300 ease-in-out",
      !isMobile && (isOpen ? "w-64 lg:w-72" : "w-0 opacity-0")
    )}>
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200/60 dark:border-stone-700/50 flex-shrink-0">
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
      <FolderTree isMobile={isMobile} />
    </aside>
  );
};

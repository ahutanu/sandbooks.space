import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { m } from 'framer-motion';
import clsx from 'clsx';
import type { SlashCommandItem } from './extensions/slashCommands';
import { menuContainerVariants, menuItemVariants, tapFeedback } from '../../utils/animationVariants';

interface SlashMenuListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashMenuListHandle {
  onKeyDown: (args: { event: KeyboardEvent }) => boolean;
}

export const SlashMenuList = forwardRef<SlashMenuListHandle, SlashMenuListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
      if (selectedIndex !== 0) {
        setSelectedIndex(0);
      }
    }, [items, selectedIndex]);

    // Auto-scroll to selected item when navigating with keyboard
    useEffect(() => {
      if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
        itemRefs.current[selectedIndex]?.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }, [selectedIndex]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }

        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }

        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    const getIcon = (iconName: string) => {
      switch (iconName) {
        case 'H1':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <text
                x="4"
                y="18"
                fontSize="14"
                fontWeight="bold"
                fill="currentColor"
                stroke="none"
              >
                H1
              </text>
            </svg>
          );
        case 'H2':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <text
                x="4"
                y="18"
                fontSize="14"
                fontWeight="bold"
                fill="currentColor"
                stroke="none"
              >
                H2
              </text>
            </svg>
          );
        case 'H3':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <text
                x="4"
                y="18"
                fontSize="14"
                fontWeight="bold"
                fill="currentColor"
                stroke="none"
              >
                H3
              </text>
            </svg>
          );
        case 'BulletList':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="8" y1="6" x2="21" y2="6" strokeWidth={2} strokeLinecap="round" />
              <line x1="8" y1="12" x2="21" y2="12" strokeWidth={2} strokeLinecap="round" />
              <line x1="8" y1="18" x2="21" y2="18" strokeWidth={2} strokeLinecap="round" />
              <circle cx="4" cy="6" r="1" fill="currentColor" />
              <circle cx="4" cy="12" r="1" fill="currentColor" />
              <circle cx="4" cy="18" r="1" fill="currentColor" />
            </svg>
          );
        case 'NumberedList':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="10" y1="6" x2="21" y2="6" strokeWidth={2} strokeLinecap="round" />
              <line x1="10" y1="12" x2="21" y2="12" strokeWidth={2} strokeLinecap="round" />
              <line x1="10" y1="18" x2="21" y2="18" strokeWidth={2} strokeLinecap="round" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h1v4M4 18h2v-4H4"
              />
            </svg>
          );
        case 'TaskList':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          );
        case 'Code':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          );
        case 'Quote':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          );
        case 'Divider':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="4" y1="12" x2="20" y2="12" strokeWidth={2} strokeLinecap="round" />
            </svg>
          );
        case 'Table':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          );
        case 'YouTube':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        case 'Image':
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          );
        default:
          return null;
      }
    };

    if (items.length === 0) {
      return (
        <div className="relative backdrop-blur-xl bg-white/90 dark:bg-stone-900/90 rounded-xl shadow-elevation-4 border border-stone-200/40 dark:border-stone-700/40 p-4 min-w-[320px] max-w-[400px]">
          {/* Inner glow overlay for glass depth */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/5 pointer-events-none" aria-hidden="true" />
          <div className="relative text-sm text-stone-500 dark:text-stone-400 text-center">
            No matching commands
          </div>
        </div>
      );
    }

    return (
      <m.div
        className="relative backdrop-blur-xl bg-white/90 dark:bg-stone-900/90 rounded-xl shadow-elevation-4 border border-stone-200/40 dark:border-stone-700/40 overflow-hidden min-w-[320px] max-w-[400px]"
        variants={menuContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Inner glow overlay for glass depth */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/5 pointer-events-none" aria-hidden="true" />
        <m.div
          className="relative px-3 py-2 border-b border-stone-200/40 dark:border-stone-700/40 bg-stone-50/50 dark:bg-stone-900/50"
          variants={menuItemVariants}
        >
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wide">
            Commands
          </div>
        </m.div>
        <div ref={containerRef} className="relative max-h-[360px] overflow-y-auto py-1">
          {items.map((item, index) => (
            <m.button
              key={index}
              ref={(el) => (itemRefs.current[index] = el)}
              onClick={() => selectItem(index)}
              variants={menuItemVariants}
              whileTap={tapFeedback}
              className={clsx(
                'w-full px-3 py-2.5 flex items-start gap-3 transition-all duration-150',
                'focus-visible:outline-none',
                index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-600'
                  : 'hover:bg-stone-50 dark:hover:bg-stone-700/50 border-l-2 border-transparent'
              )}
              aria-label={`${item.title} - ${item.description}`}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div
                className={clsx(
                  'flex-shrink-0 mt-0.5',
                  index === selectedIndex
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-stone-600 dark:text-stone-400'
                )}
              >
                {getIcon(item.icon)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div
                  className={clsx(
                    'text-sm font-medium',
                    index === selectedIndex
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-stone-900 dark:text-stone-100'
                  )}
                >
                  {item.title}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                  {item.description}
                </div>
              </div>
            </m.button>
          ))}
        </div>
        <m.div
          className="relative px-3 py-2 border-t border-stone-200/40 dark:border-stone-700/40 bg-stone-50/50 dark:bg-stone-900/50"
          variants={menuItemVariants}
        >
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded shadow-sm">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded shadow-sm">
                Enter
              </kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded shadow-sm">
                Esc
              </kbd>
              Close
            </span>
          </div>
        </m.div>
      </m.div>
    );
  }
);

SlashMenuList.displayName = 'SlashMenuList';

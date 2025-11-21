import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import clsx from 'clsx';
import type { SlashCommandItem } from './extensions/slashCommands';

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
        default:
          return null;
      }
    };

    if (items.length === 0) {
      return (
        <div className="bg-white dark:bg-stone-800 rounded-xl shadow-elevation-4 border border-stone-200 dark:border-stone-700 p-4 min-w-[320px] max-w-[400px]">
          <div className="text-sm text-stone-500 dark:text-stone-400 text-center">
            No matching commands
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-stone-800 rounded-xl shadow-elevation-4 border border-stone-200 dark:border-stone-700 overflow-hidden min-w-[320px] max-w-[400px]">
        <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wide">
            Commands
          </div>
        </div>
        <div ref={containerRef} className="max-h-[360px] overflow-y-auto py-1">
          {items.map((item, index) => (
            <button
              key={index}
              ref={(el) => (itemRefs.current[index] = el)}
              onClick={() => selectItem(index)}
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
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
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
        </div>
      </div>
    );
  }
);

SlashMenuList.displayName = 'SlashMenuList';

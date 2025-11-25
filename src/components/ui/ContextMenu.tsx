import React, { useEffect, useRef, useCallback, useState } from 'react';
import clsx from 'clsx';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  shortcut?: string;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
}

interface MenuPosition {
  x: number;
  y: number;
}

/**
 * Context menu component with Apple-like styling
 *
 * Features:
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Focus management
 * - Viewport boundary detection
 * - Glass morphism styling
 *
 * Usage:
 * <ContextMenu items={[{ id: 'copy', label: 'Copy', onClick: handleCopy }]}>
 *   <div>Right-click me</div>
 * </ContextMenu>
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({ items, children, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const focusedIndexRef = useRef(focusedIndex);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  const closeMenu = useCallback(() => {
    if (isOpen) {
      setIsClosing(true);
      setFocusedIndex(-1);
      setTimeout(() => {
        setIsClosing(false);
        setIsOpen(false);
      }, 100);
    }
  }, [isOpen]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate position, ensuring menu stays in viewport
    const x = e.clientX;
    const y = e.clientY;

    setPosition({ x, y });
    setIsOpen(true);
    setIsClosing(false);
  }, []);

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.disabled) return;
    closeMenu();
    // Small delay to allow animation before action
    setTimeout(() => item.onClick(), 50);
  }, [closeMenu]);

  // Adjust position after render to ensure menu stays in viewport
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let adjustedX = position.x;
      let adjustedY = position.y;

      // Adjust horizontal position
      if (position.x + rect.width > viewport.width - 8) {
        adjustedX = viewport.width - rect.width - 8;
      }

      // Adjust vertical position
      if (position.y + rect.height > viewport.height - 8) {
        adjustedY = viewport.height - rect.height - 8;
      }

      if (adjustedX !== position.x || adjustedY !== position.y) {
        setPosition({ x: adjustedX, y: adjustedY });
      }
    }
  }, [isOpen, position.x, position.y]);

  // Close on click outside and handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const enabledIndices = items
        .map((item, idx) => (!item.disabled ? idx : -1))
        .filter(idx => idx !== -1);

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeMenu();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (enabledIndices.length === 0) return;
          setFocusedIndex(prev => {
            const currentEnabledIdx = enabledIndices.indexOf(prev);
            const nextEnabledIdx = currentEnabledIdx < enabledIndices.length - 1
              ? currentEnabledIdx + 1
              : 0;
            return enabledIndices[nextEnabledIdx];
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (enabledIndices.length === 0) return;
          setFocusedIndex(prev => {
            const currentEnabledIdx = enabledIndices.indexOf(prev);
            const prevEnabledIdx = currentEnabledIdx > 0
              ? currentEnabledIdx - 1
              : enabledIndices.length - 1;
            return enabledIndices[prevEnabledIdx];
          });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          {
            const idx = focusedIndexRef.current;
            if (idx >= 0 && idx < items.length && !items[idx].disabled) {
              handleItemClick(items[idx]);
            }
          }
          break;
        case 'Home':
          e.preventDefault();
          if (enabledIndices.length > 0) {
            setFocusedIndex(enabledIndices[0]);
          }
          break;
        case 'End':
          e.preventDefault();
          if (enabledIndices.length > 0) {
            setFocusedIndex(enabledIndices[enabledIndices.length - 1]);
          }
          break;
      }
    };

    // Delay adding listener to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeMenu, items, handleItemClick]);

  // Focus item when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  const isVisible = isOpen || isClosing;

  return (
    <>
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        className={className}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Context menu"
          className={clsx(
            'fixed z-[100] min-w-[160px] py-1.5',
            'bg-white/95 dark:bg-stone-800/95 backdrop-blur-xl',
            'rounded-lg shadow-xl',
            'border border-stone-200/80 dark:border-stone-700/80',
            'transition-all duration-100 ease-out',
            isClosing
              ? 'opacity-0 scale-95'
              : 'opacity-100 scale-100'
          )}
          style={{
            left: position.x,
            top: position.y,
            transformOrigin: 'top left',
          }}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={el => { itemRefs.current[index] = el; }}
              role="menuitem"
              tabIndex={focusedIndex === index ? 0 : -1}
              disabled={item.disabled}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={clsx(
                'w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left',
                'transition-colors duration-75',
                'focus:outline-none',
                focusedIndex === index && !item.disabled && 'bg-stone-100 dark:bg-stone-700',
                item.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : item.variant === 'danger'
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                    : 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700',
                index === 0 && 'rounded-t-md',
                index === items.length - 1 && 'rounded-b-md'
              )}
            >
              {item.icon && (
                <span className="w-4 h-4 flex items-center justify-center opacity-70">
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-stone-400 dark:text-stone-500 ml-4">
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

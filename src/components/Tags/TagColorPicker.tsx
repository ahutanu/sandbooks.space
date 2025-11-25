import React, { useEffect, useRef, useState } from 'react';
import { showToast as toast } from '../../utils/toast';
import type { TagColor } from '../../types/tags.types';
import { TAG_COLORS } from '../../utils/tagColors';
import { useNotesStore } from '../../store/notesStore';

// Checkmark icon for selected color
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

interface TagColorPickerProps {
  tagId: string;
  tagName: string;
  currentColor: TagColor;
  isOpen: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

export const TagColorPicker: React.FC<TagColorPickerProps> = ({
  tagId,
  tagName,
  currentColor,
  isOpen,
  onClose,
  anchorEl,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const updateTag = useNotesStore((state) => state.updateTag);

  // Calculate popover position when opened
  useEffect(() => {
    if (isOpen && anchorEl && popoverRef.current) {
      const anchorRect = anchorEl.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      // Position below the anchor element
      let top = anchorRect.bottom + scrollY + 8;
      let left = anchorRect.left + scrollX;

      // Adjust if popover would go off-screen (right edge)
      if (left + popoverRect.width > window.innerWidth) {
        left = window.innerWidth - popoverRect.width - 16;
      }

      // Adjust if popover would go off-screen (bottom edge)
      if (top + popoverRect.height > window.innerHeight + scrollY) {
        top = anchorRect.top + scrollY - popoverRect.height - 8;
      }

      setPosition((prev) => {
        if (prev.top === top && prev.left === left) {
          return prev;
        }
        return { top, left };
      });
    }
  }, [isOpen, anchorEl]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorEl &&
        !anchorEl.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorEl]);

  // Focus trap
  useEffect(() => {
    if (isOpen && popoverRef.current) {
      const focusableElements = popoverRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [isOpen]);

  const handleColorSelect = (color: TagColor) => {
    // Update tag color globally
    updateTag(tagId, { color });

    // Show success toast
    toast.success(`Tag color updated`, {
      duration: 2000,
      position: 'bottom-center',
    });

    // Close picker
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent, color: TagColor) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleColorSelect(color);
    }
  };

  if (!isOpen) return null;

  // Get color swatch background classes
  const getSwatchClasses = (color: TagColor): string => {
    const colorMap: Record<TagColor, string> = {
      gray: 'bg-stone-500',
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      amber: 'bg-amber-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
      emerald: 'bg-emerald-500',
      blue: 'bg-blue-500',
      indigo: 'bg-indigo-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500',
      rose: 'bg-rose-500',
    };
    return colorMap[color];
  };

  const getColorName = (color: TagColor): string => {
    return color.charAt(0).toUpperCase() + color.slice(1);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'transparent' }}
        aria-hidden="true"
      />

      {/* Popover */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={`Choose color for ${tagName} tag`}
        className="
          fixed z-50
          bg-white/90 dark:bg-stone-800/90
          backdrop-blur-xl
          rounded-xl
          overflow-hidden
          shadow-[0_4px_6px_-2px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(0,0,0,0.12)]
          dark:shadow-[0_4px_6px_-2px_rgba(0,0,0,0.2),0_8px_16px_-4px_rgba(0,0,0,0.3)]
          border border-stone-200/40 dark:border-stone-700/40
          p-4
          transform
          transition-all duration-200
          animate-in fade-in zoom-in-95
        "
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          willChange: 'transform, opacity',
        }}
      >
        {/* Inner glow overlay for glass depth */}
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/10 pointer-events-none"
          aria-hidden="true"
        />
        {/* Header */}
        <div className="relative mb-3">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Choose tag color
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {tagName}
          </p>
        </div>

        {/* Color Grid */}
        <div
          className="relative grid grid-cols-4 gap-2"
          role="group"
          aria-label="Color options"
        >
          {TAG_COLORS.map((color) => {
            const isSelected = color === currentColor;

            return (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                onKeyDown={(e) => handleKeyDown(e, color)}
                aria-label={`Select ${getColorName(color)} color${isSelected ? ' (current)' : ''
                  }`}
                aria-pressed={isSelected}
                className={`
                  relative w-8 h-8 rounded-md
                  ${getSwatchClasses(color)}
                  border-2 transition-all duration-200
                  hover:scale-105 hover:shadow-lg
                  focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900
                  ${isSelected
                    ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/30'
                    : 'border-transparent hover:border-stone-300 dark:hover:border-stone-600'
                  }
                `}
                style={{
                  willChange: 'transform',
                }}
              >
                {/* Checkmark for selected color */}
                {isSelected && (
                  <CheckIcon className="w-5 h-5 text-white drop-shadow-md absolute inset-0 m-auto" />
                )}

                {/* Screen reader only color name */}
                <span className="sr-only">{getColorName(color)}</span>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="relative mt-3 pt-3 border-t border-stone-200/40 dark:border-stone-700/40">
          <p className="text-xs text-stone-500 dark:text-stone-400 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono text-[10px]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </>
  );
};

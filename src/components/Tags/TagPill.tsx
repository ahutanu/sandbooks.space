import React, { useState } from 'react';
import type { Tag } from '../../types/tags.types';
import { getTagColorClasses } from '../../utils/tagColors';
import { TagColorPicker } from './TagColorPicker';

// Simple X icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

interface TagPillProps {
  tag: Tag;
  size?: 'xs' | 'sm' | 'md';
  interactive?: boolean;
  onRemove?: (tagId: string) => void;
  onClick?: (tagId: string) => void;
  isHighlighted?: boolean;
  className?: string;
  showColorPicker?: boolean; // New prop to enable color picker
}

export const TagPill: React.FC<TagPillProps> = ({
  tag,
  size = 'md',
  interactive = true,
  onRemove,
  onClick,
  isHighlighted = false,
  className = '',
  showColorPicker = false,
}) => {
  const colorClasses = getTagColorClasses(tag.color);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs rounded gap-1',
    sm: 'px-2 py-0.5 text-xs rounded-md gap-1',
    md: 'px-2.5 py-1 text-xs rounded-md gap-1.5',
  };

  const handleClick = () => {
    if (interactive && onClick) {
      onClick(tag.id);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(tag.id);
    }
  };

  const handleColorDotClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsColorPickerOpen(true);
    setAnchorEl(e.currentTarget);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (onRemove) {
        onRemove(tag.id);
      }
    }
  };

  // Get solid background color for color dot
  const getColorDotClass = (): string => {
    const colorMap: Record<string, string> = {
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
    return colorMap[tag.color] || 'bg-blue-500';
  };

  return (
    <>
      <span
        role={interactive ? 'button' : 'text'}
        tabIndex={interactive ? 0 : -1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Tag: ${tag.name}. ${
          interactive ? 'Press Enter to filter, Backspace to remove.' : ''
        }`}
        className={`
          group inline-flex items-center font-medium
          transition-all duration-200
          ${sizeClasses[size]}
          ${colorClasses.bg}
          ${colorClasses.text}
          ${colorClasses.border}
          ${
            interactive
              ? `
            cursor-pointer
            ${colorClasses.hoverBg}
            hover:shadow-md hover:scale-105
            focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900
          `
              : ''
          }
          ${
            isHighlighted
              ? `
            ring-2 ${colorClasses.ring}
            shadow-md
          `
              : ''
          }
          ${className}
        `}
      >
        {/* Color Dot Button (if enabled) */}
        {showColorPicker && (
          <button
            onClick={handleColorDotClick}
            aria-label={`Change tag color for ${tag.name}`}
            className={`
              w-3 h-3 rounded-full
              ${getColorDotClass()}
              border border-white/50 dark:border-black/30
              shadow-sm
              hover:scale-125 hover:shadow-md
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white dark:focus-visible:ring-black focus-visible:ring-offset-1 focus-visible:ring-offset-current
              transition-all duration-200
              -ml-0.5
            `}
            style={{ willChange: 'transform' }}
          />
        )}

        <span className="text-current">{tag.name}</span>

        {onRemove && (
          <button
            onClick={handleRemove}
            aria-label={`Remove ${tag.name} tag`}
            className="
              opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
              -mr-0.5 p-0.5 rounded
              hover:bg-black/10 dark:hover:bg-white/10
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:opacity-100
              transition-all duration-200
            "
          >
            <XIcon className="w-3 h-3" />
          </button>
        )}
      </span>

      {/* Color Picker Popover */}
      {showColorPicker && (
        <TagColorPicker
          tagId={tag.id}
          tagName={tag.name}
          currentColor={tag.color}
          isOpen={isColorPickerOpen}
          onClose={() => {
            setIsColorPickerOpen(false);
            setAnchorEl(null);
          }}
          anchorEl={anchorEl}
        />
      )}
    </>
  );
};

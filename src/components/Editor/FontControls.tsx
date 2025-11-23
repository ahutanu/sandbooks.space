import { useState, useRef, useEffect } from 'react';
import { computePosition, offset, flip, shift } from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';

interface FontControlsProps {
  editor: Editor;
  onClose: () => void;
  anchorElement: HTMLElement | null;
}

const FONT_FAMILIES = [
  { name: 'JetBrains Mono', value: 'JetBrains Mono Variable, monospace' },
  { name: 'Inter', value: 'Inter Variable, sans-serif' },
  { name: 'System', value: 'system-ui, -apple-system, sans-serif' },
];

const DEFAULT_FONT_FAMILY = 'JetBrains Mono Variable, monospace';
const DEFAULT_FONT_SIZE = '14';

const FONT_SIZES = [
  { label: '12px', value: '12' },
  { label: '14px', value: '14' },
  { label: '16px', value: '16' },
  { label: '18px', value: '18' },
  { label: '20px', value: '20' },
  { label: '24px', value: '24' },
  { label: '30px', value: '30' },
  { label: '36px', value: '36' },
  { label: '48px', value: '48' },
  { label: '72px', value: '72' },
];

export const FontControls = ({ editor, onClose, anchorElement }: FontControlsProps) => {
  const [showFamily, setShowFamily] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const familyRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchorElement || !popoverRef.current) return;

    const updatePosition = async () => {
      if (popoverRef.current && anchorElement) {
        const { x, y } = await computePosition(anchorElement, popoverRef.current, {
          placement: 'bottom-start',
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        });

        if (popoverRef.current) {
          popoverRef.current.style.left = `${x}px`;
          popoverRef.current.style.top = `${y}px`;
        }
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 100);
    return () => clearInterval(interval);
  }, [anchorElement, showFamily, showSize]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        (!popoverRef.current || !popoverRef.current.contains(e.target as Node)) &&
        (!familyRef.current || !familyRef.current.contains(e.target as Node)) &&
        (!sizeRef.current || !sizeRef.current.contains(e.target as Node)) &&
        anchorElement &&
        !anchorElement.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorElement]);

  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || DEFAULT_FONT_FAMILY;
  const currentFontSize = editor.getAttributes('textStyle').fontSize || DEFAULT_FONT_SIZE;

  return (
    <div
      ref={popoverRef}
      className="fixed bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-elevation-3 p-4 min-w-[280px] max-w-[320px] z-50 animate-fadeInSlideUp"
      role="dialog"
      aria-label="Font controls"
    >
      <div className="text-sm font-semibold text-stone-900 dark:text-stone-50 mb-3">
        Font
      </div>

      {/* Font Family Section */}
      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
          Family
        </label>
        <div className="relative">
          <button
            onClick={() => {
              setShowFamily(!showFamily);
              setShowSize(false);
            }}
            className="w-full text-sm text-stone-900 dark:text-stone-50 px-3 py-2 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-colors duration-200 text-left flex items-center justify-between"
            aria-label="Font family"
            aria-expanded={showFamily}
          >
            <span style={{ fontFamily: currentFontFamily }}>
              {FONT_FAMILIES.find(f => f.value === currentFontFamily)?.name || 'JetBrains Mono'}
            </span>
            <svg
              className={`w-4 h-4 text-stone-500 dark:text-stone-400 transition-transform duration-200 ${
                showFamily ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showFamily && (
            <div
              ref={familyRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-elevation-3 p-1 z-50 max-h-[200px] overflow-y-auto"
              role="listbox"
            >
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.value}
                  onClick={() => {
                    editor.chain().focus().setFontFamily(font.value).run();
                    setShowFamily(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-stone-900 dark:text-stone-50 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors duration-150 text-left ${
                    currentFontFamily === font.value ? 'bg-stone-100 dark:bg-stone-700' : ''
                  }`}
                  style={{ fontFamily: font.value }}
                  role="option"
                  aria-selected={currentFontFamily === font.value}
                >
                  {font.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Font Size Section */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
          Size
        </label>
        <div className="relative">
          <button
            onClick={() => {
              setShowSize(!showSize);
              setShowFamily(false);
            }}
            className="w-full text-sm text-stone-900 dark:text-stone-50 px-3 py-2 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-colors duration-200 text-left flex items-center justify-between"
            aria-label="Font size"
            aria-expanded={showSize}
          >
            <span style={{ fontSize: `${currentFontSize}px` }}>
              {currentFontSize}px
            </span>
            <svg
              className={`w-4 h-4 text-stone-500 dark:text-stone-400 transition-transform duration-200 ${
                showSize ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showSize && (
            <div
              ref={sizeRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-elevation-3 p-1 z-50 max-h-[200px] overflow-y-auto"
              role="listbox"
            >
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => {
                    editor.chain().focus().setFontSize(size.value).run();
                    setShowSize(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-stone-900 dark:text-stone-50 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors duration-150 text-left ${
                    currentFontSize === size.value ? 'bg-stone-100 dark:bg-stone-700' : ''
                  }`}
                  style={{ fontSize: `${size.value}px` }}
                  role="option"
                  aria-selected={currentFontSize === size.value}
                >
                  {size.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

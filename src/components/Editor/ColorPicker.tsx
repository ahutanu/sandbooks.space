import { useState, useEffect, useRef } from 'react';
import { computePosition, offset, flip, shift } from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';

interface ColorPickerProps {
  editor: Editor;
  onClose: () => void;
  anchorElement: HTMLElement | null;
  mode: 'text' | 'highlight';
  onModeChange: (mode: 'text' | 'highlight') => void;
}

const STONE_COLORS = [
  { name: 'Stone 50', value: '#FAFAF9' },
  { name: 'Stone 100', value: '#F5F5F4' },
  { name: 'Stone 200', value: '#E7E5E4' },
  { name: 'Stone 300', value: '#D6D3D1' },
  { name: 'Stone 400', value: '#A8A29E' },
  { name: 'Stone 500', value: '#78716C' },
  { name: 'Stone 700', value: '#44403C' },
  { name: 'Stone 800', value: '#292524' },
  { name: 'Stone 900', value: '#1C1917' },
  { name: 'Stone 950', value: '#0C0A09' },
];

const ACCENT_COLORS = [
  { name: 'Blue 600', value: '#2563EB' },
  { name: 'Green 600', value: '#16A34A' },
  { name: 'Yellow 600', value: '#CA8A04' },
  { name: 'Red 600', value: '#DC2626' },
  { name: 'Purple 600', value: '#9333EA' },
  { name: 'Orange 600', value: '#EA580C' },
];

export const ColorPicker = ({ editor, onClose, anchorElement, mode, onModeChange }: ColorPickerProps) => {
  const [customColor, setCustomColor] = useState('#000000');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) && anchorElement && !anchorElement.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorElement]);

  useEffect(() => {
    if (!popoverRef.current || !anchorElement) return;

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
  }, [anchorElement]);

  const applyColor = (color: string) => {
    if (mode === 'text') {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
  };

  const getCurrentColor = () => {
    if (mode === 'text') {
      return editor.getAttributes('textStyle').color || 'transparent';
    } else {
      return editor.getAttributes('highlight').color || 'transparent';
    }
  };

  const currentColor = getCurrentColor();

  return (
    <div
      ref={popoverRef}
      className="fixed bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-elevation-3 p-4 min-w-[280px] max-w-[320px] z-50 animate-fadeInSlideUp"
      role="dialog"
      aria-label="Choose color"
    >
      <div className="text-sm font-semibold text-stone-900 dark:text-stone-50 mb-3">
        {mode === 'text' ? 'Text Color' : 'Highlight Color'}
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 dark:bg-stone-900/50 mb-3">
        <button
          onClick={() => onModeChange('text')}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-200 ${
            mode === 'text'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Text
        </button>
        <button
          onClick={() => onModeChange('highlight')}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-200 ${
            mode === 'highlight'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Highlight
        </button>
      </div>

      {/* Stone Palette */}
      <div className="mb-3">
        <div className="grid grid-cols-8 gap-2">
          {STONE_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => applyColor(color.value)}
              className={`w-8 h-8 rounded-lg border-2 transition-transform duration-150 hover:scale-105 ${
                currentColor === color.value
                  ? 'border-stone-900 dark:border-stone-100 ring-2 ring-blue-500/50'
                  : 'border-stone-200 dark:border-stone-700'
              }`}
              style={{ backgroundColor: color.value }}
              aria-label={color.name}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Accent Colors */}
      <div className="mb-3">
        <div className="grid grid-cols-6 gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => applyColor(color.value)}
              className={`w-8 h-8 rounded-lg border-2 transition-transform duration-150 hover:scale-105 ${
                currentColor === color.value
                  ? 'border-stone-900 dark:border-stone-100 ring-2 ring-blue-500/50'
                  : 'border-stone-200 dark:border-stone-700'
              }`}
              style={{ backgroundColor: color.value }}
              aria-label={color.name}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Custom Color */}
      <div className="mt-3">
        <label className="block text-xs text-stone-500 dark:text-stone-400 mb-2">
          Custom Color
        </label>
        <input
          type="color"
          value={customColor}
          onChange={(e) => {
            setCustomColor(e.target.value);
            applyColor(e.target.value);
          }}
          className="w-full h-8 rounded-lg border border-stone-200 dark:border-stone-700 cursor-pointer"
        />
      </div>
    </div>
  );
};


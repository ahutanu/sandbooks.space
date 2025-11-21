/**
 * TagColorPickerDemo - Interactive demonstration component
 *
 * This component demonstrates the tag color picker functionality.
 * Use this to test the color picker UI in isolation.
 *
 * Usage:
 * 1. Import this component into your App.tsx temporarily
 * 2. Add <TagColorPickerDemo /> to the layout
 * 3. Test all color picker features
 * 4. Remove when satisfied with functionality
 */

import React from 'react';
import { useNotesStore } from '../../store/notesStore';
import { TagPill } from './TagPill';

export const TagColorPickerDemo: React.FC = () => {
  const tags = useNotesStore((state) => state.tags);
  const addTag = useNotesStore((state) => state.addTag);
  const deleteTag = useNotesStore((state) => state.deleteTag);
  const getAllTagsWithCounts = useNotesStore((state) => state.getAllTagsWithCounts);

  // Create demo tags if none exist
  React.useEffect(() => {
    if (tags.length === 0) {
      addTag('Important', 'blue');
      addTag('Work', 'emerald');
      addTag('Personal', 'purple');
      addTag('Ideas', 'amber');
      addTag('Todo', 'rose');
    }
  }, [tags.length, addTag]); // Only run once on mount, but reuses stable Zustand actions

  const tagsWithCounts = getAllTagsWithCounts();

  const handleCreateTag = () => {
    const name = prompt('Enter tag name:');
    if (name && name.trim()) {
      addTag(name.trim());
    }
  };

  return (
    <div className="p-8 space-y-8 bg-stone-50 dark:bg-stone-900 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Tag Color Picker Demo
        </h1>
        <p className="text-stone-600 dark:text-stone-400">
          Click the colored dot on any tag to change its color. Changes are saved globally.
        </p>
      </div>

      {/* Demo Section 1: With Color Picker */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-stone-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            Tags with Color Picker
          </h2>
          <button
            onClick={handleCreateTag}
            className="
              px-4 py-2 rounded-lg
              bg-blue-500 hover:bg-blue-600
              text-white font-medium text-sm
              transition-colors duration-200
              focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-2
            "
          >
            + New Tag
          </button>
        </div>

        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
          Click the color dot to customize each tag's color
        </p>

        <div className="flex flex-wrap gap-3">
          {tagsWithCounts.map((tag) => (
            <TagPill
              key={tag.id}
              tag={tag}
              size="md"
              showColorPicker={true}
              onRemove={deleteTag}
              interactive={false}
            />
          ))}

          {tagsWithCounts.length === 0 && (
            <p className="text-stone-400 dark:text-stone-500 italic">
              No tags yet. Click "+ New Tag" to create one.
            </p>
          )}
        </div>

        {tagsWithCounts.length > 0 && (
          <div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-700">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">
              Tag Usage
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tagsWithCounts.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-900/50"
                >
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {tag.name}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {tag.noteCount} {tag.noteCount === 1 ? 'note' : 'notes'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Demo Section 2: Without Color Picker (Original) */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-stone-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
          Tags without Color Picker (Original Behavior)
        </h2>

        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
          No color dot, cannot customize colors
        </p>

        <div className="flex flex-wrap gap-3">
          {tagsWithCounts.map((tag) => (
            <TagPill
              key={tag.id}
              tag={tag}
              size="md"
              showColorPicker={false}
              interactive={true}
              onClick={(tagId) => alert(`Clicked tag: ${tagId}`)}
            />
          ))}
        </div>
      </div>

      {/* Demo Section 3: All Sizes */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-stone-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
          Size Variations
        </h2>

        {tagsWithCounts.slice(0, 1).map((tag) => (
          <div key={tag.id} className="space-y-4">
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">
                Extra Small (xs)
              </p>
              <TagPill tag={tag} size="xs" showColorPicker={true} />
            </div>

            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">
                Small (sm)
              </p>
              <TagPill tag={tag} size="sm" showColorPicker={true} />
            </div>

            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">
                Medium (md) - Default
              </p>
              <TagPill tag={tag} size="md" showColorPicker={true} />
            </div>
          </div>
        ))}

        {tagsWithCounts.length === 0 && (
          <p className="text-stone-400 dark:text-stone-500 italic">
            Create a tag to see size variations
          </p>
        )}
      </div>

      {/* Demo Section 4: Feature Checklist */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-stone-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
          Testing Checklist
        </h2>

        <ul className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Click the color dot on any tag to open the color picker</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Click a color swatch to change the tag color</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Current color shows a checkmark indicator</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Click outside the popover to close it</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Press Escape to close the popover</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Tab through color swatches for keyboard navigation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Press Enter or Space to select a color</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Toast notification appears on color change</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Color updates globally (all instances update)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Changes persist after page reload</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Glass morphism effect visible in popover</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span>Dark mode styling works correctly</span>
          </li>
        </ul>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Tip:</strong> Toggle dark mode (moon icon in header) to test color picker in both themes.
            All colors should be clearly visible and accessible.
          </p>
        </div>
      </div>

      {/* Demo Section 5: Accessibility Info */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-stone-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
          Accessibility Features
        </h2>

        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-2">
              Keyboard Navigation
            </h3>
            <ul className="space-y-1 text-stone-600 dark:text-stone-400 ml-4">
              <li>• Tab: Navigate through color swatches</li>
              <li>• Enter/Space: Select highlighted color</li>
              <li>• Escape: Close color picker</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-2">
              Screen Reader Support
            </h3>
            <ul className="space-y-1 text-stone-600 dark:text-stone-400 ml-4">
              <li>• ARIA labels on all interactive elements</li>
              <li>• Dialog role for color picker popover</li>
              <li>• Pressed state announced for current color</li>
              <li>• Toast notifications are announced</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-2">
              Visual Indicators
            </h3>
            <ul className="space-y-1 text-stone-600 dark:text-stone-400 ml-4">
              <li>• Focus rings visible (not just hover states)</li>
              <li>• High contrast checkmark on selected color</li>
              <li>• Touch-friendly 32x32px swatches</li>
              <li>• Smooth animations (200ms)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

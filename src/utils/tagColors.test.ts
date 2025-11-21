import { describe, it, expect } from 'vitest';
import { TAG_COLORS, getTagColorClasses, getNextTagColor } from './tagColors';
import type { Tag, TagColor } from '../types/tags.types';

describe('tagColors', () => {
  describe('TAG_COLORS constant', () => {
    it('exports array of 12 colors', () => {
      expect(TAG_COLORS).toHaveLength(12);
    });

    it('includes expected color values', () => {
      expect(TAG_COLORS).toEqual([
        'blue',
        'emerald',
        'purple',
        'amber',
        'rose',
        'indigo',
        'green',
        'orange',
        'pink',
        'yellow',
        'red',
        'gray',
      ]);
    });
  });

  describe('getTagColorClasses', () => {
    it('returns color classes for blue', () => {
      const classes = getTagColorClasses('blue');
      expect(classes.bg).toContain('bg-blue-500/10');
      expect(classes.text).toContain('text-blue-700');
      expect(classes.border).toBe('border-transparent');
      expect(classes.hoverBg).toContain('hover:bg-blue-500/20');
      expect(classes.ring).toBe('ring-blue-500');
    });

    it('returns color classes for emerald', () => {
      const classes = getTagColorClasses('emerald');
      expect(classes.bg).toContain('bg-emerald-500/10');
      expect(classes.text).toContain('text-emerald-700');
      expect(classes.ring).toBe('ring-emerald-500');
    });

    it('returns color classes for purple', () => {
      const classes = getTagColorClasses('purple');
      expect(classes.bg).toContain('bg-purple-500/10');
      expect(classes.text).toContain('text-purple-700');
      expect(classes.ring).toBe('ring-purple-500');
    });

    it('returns color classes for amber', () => {
      const classes = getTagColorClasses('amber');
      expect(classes.bg).toContain('bg-amber-500/10');
      expect(classes.text).toContain('text-amber-700');
      expect(classes.ring).toBe('ring-amber-500');
    });

    it('returns color classes for rose', () => {
      const classes = getTagColorClasses('rose');
      expect(classes.bg).toContain('bg-rose-500/10');
      expect(classes.text).toContain('text-rose-700');
      expect(classes.ring).toBe('ring-rose-500');
    });

    it('returns color classes for indigo', () => {
      const classes = getTagColorClasses('indigo');
      expect(classes.bg).toContain('bg-indigo-500/10');
      expect(classes.text).toContain('text-indigo-700');
      expect(classes.ring).toBe('ring-indigo-500');
    });

    it('returns color classes for green', () => {
      const classes = getTagColorClasses('green');
      expect(classes.bg).toContain('bg-green-500/10');
      expect(classes.text).toContain('text-green-700');
      expect(classes.ring).toBe('ring-green-500');
    });

    it('returns color classes for orange', () => {
      const classes = getTagColorClasses('orange');
      expect(classes.bg).toContain('bg-orange-500/10');
      expect(classes.text).toContain('text-orange-700');
      expect(classes.ring).toBe('ring-orange-500');
    });

    it('returns color classes for pink', () => {
      const classes = getTagColorClasses('pink');
      expect(classes.bg).toContain('bg-pink-500/10');
      expect(classes.text).toContain('text-pink-700');
      expect(classes.ring).toBe('ring-pink-500');
    });

    it('returns color classes for yellow', () => {
      const classes = getTagColorClasses('yellow');
      expect(classes.bg).toContain('bg-yellow-500/10');
      expect(classes.text).toContain('text-yellow-700');
      expect(classes.ring).toBe('ring-yellow-500');
    });

    it('returns color classes for red', () => {
      const classes = getTagColorClasses('red');
      expect(classes.bg).toContain('bg-red-500/10');
      expect(classes.text).toContain('text-red-700');
      expect(classes.ring).toBe('ring-red-500');
    });

    it('returns color classes for gray', () => {
      const classes = getTagColorClasses('gray');
      expect(classes.bg).toContain('bg-stone-500/10');
      expect(classes.text).toContain('text-stone-700');
      expect(classes.ring).toBe('ring-stone-500');
    });

    it('includes dark mode classes for all colors', () => {
      TAG_COLORS.forEach((color) => {
        const classes = getTagColorClasses(color);
        expect(classes.bg).toContain('dark:');
        expect(classes.text).toContain('dark:');
        expect(classes.hoverBg).toContain('dark:');
      });
    });
  });

  describe('getNextTagColor', () => {
    const createTag = (id: string, name: string, color: TagColor): Tag => ({
      id,
      name,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    it('returns first color (blue) when no tags exist', () => {
      const nextColor = getNextTagColor([]);
      expect(nextColor).toBe('blue');
    });

    it('returns least-used color when tags exist', () => {
      const tags = [
        createTag('1', 'Tag 1', 'blue'),
        createTag('2', 'Tag 2', 'blue'),
        createTag('3', 'Tag 3', 'red'),
      ];
      const nextColor = getNextTagColor(tags);
      // Should return one of the unused colors (not blue or red)
      expect(nextColor).not.toBe('blue');
      expect(nextColor).not.toBe('red');
      expect(TAG_COLORS).toContain(nextColor);
    });

    it('returns least-used color when all colors are used', () => {
      const tags = [
        createTag('1', 'Tag 1', 'blue'),
        createTag('2', 'Tag 2', 'blue'),
        createTag('3', 'Tag 3', 'emerald'),
        createTag('4', 'Tag 4', 'purple'),
        createTag('5', 'Tag 5', 'amber'),
        createTag('6', 'Tag 6', 'rose'),
        createTag('7', 'Tag 7', 'indigo'),
        createTag('8', 'Tag 8', 'green'),
        createTag('9', 'Tag 9', 'orange'),
        createTag('10', 'Tag 10', 'pink'),
        createTag('11', 'Tag 11', 'yellow'),
        createTag('12', 'Tag 12', 'red'),
        createTag('13', 'Tag 13', 'gray'),
      ];
      const nextColor = getNextTagColor(tags);
      // Should return one of the colors used only once
      expect(['emerald', 'purple', 'amber', 'rose', 'indigo', 'green', 'orange', 'pink', 'yellow', 'red', 'gray']).toContain(nextColor);
    });

    it('returns color with minimum usage count', () => {
      const tags = [
        createTag('1', 'Tag 1', 'blue'),
        createTag('2', 'Tag 2', 'blue'),
        createTag('3', 'Tag 3', 'blue'),
        createTag('4', 'Tag 4', 'emerald'),
        createTag('5', 'Tag 5', 'emerald'),
      ];
      const nextColor = getNextTagColor(tags);
      // Should return one of the unused colors, not blue or emerald
      expect(nextColor).not.toBe('blue');
      expect(nextColor).not.toBe('emerald');
    });

    it('handles single tag', () => {
      const tags = [createTag('1', 'Tag 1', 'purple')];
      const nextColor = getNextTagColor(tags);
      expect(TAG_COLORS).toContain(nextColor);
      expect(nextColor).not.toBe('purple');
    });
  });
});

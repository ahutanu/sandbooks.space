import type { TagColor, Tag } from '../types/tags.types';

export const TAG_COLORS: TagColor[] = [
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
];

interface TagColorClasses {
  bg: string;
  text: string;
  border: string;
  hoverBg: string;
  ring: string;
}

export const getTagColorClasses = (color: TagColor): TagColorClasses => {
  const colorMap: Record<TagColor, TagColorClasses> = {
    gray: {
      bg: 'bg-stone-500/10 dark:bg-stone-400/10',
      text: 'text-stone-700 dark:text-stone-300',
      border: 'border-transparent',
      hoverBg: 'hover:bg-stone-500/20 dark:hover:bg-stone-400/20',
      ring: 'ring-stone-500',
    },
    red: {
      bg: 'bg-red-500/10 dark:bg-red-400/10',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-red-500/20 dark:hover:bg-red-400/20',
      ring: 'ring-red-500',
    },
    orange: {
      bg: 'bg-orange-500/10 dark:bg-orange-400/10',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-orange-500/20 dark:hover:bg-orange-400/20',
      ring: 'ring-orange-500',
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-400/10',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-amber-500/20 dark:hover:bg-amber-400/20',
      ring: 'ring-amber-500',
    },
    yellow: {
      bg: 'bg-yellow-500/10 dark:bg-yellow-400/10',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-yellow-500/20 dark:hover:bg-yellow-400/20',
      ring: 'ring-yellow-500',
    },
    green: {
      bg: 'bg-green-500/10 dark:bg-green-400/10',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-green-500/20 dark:hover:bg-green-400/20',
      ring: 'ring-green-500',
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-emerald-500/20 dark:hover:bg-emerald-400/20',
      ring: 'ring-emerald-500',
    },
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-400/10',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-blue-500/20 dark:hover:bg-blue-400/20',
      ring: 'ring-blue-500',
    },
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-400/10',
      text: 'text-indigo-700 dark:text-indigo-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-indigo-500/20 dark:hover:bg-indigo-400/20',
      ring: 'ring-indigo-500',
    },
    purple: {
      bg: 'bg-purple-500/10 dark:bg-purple-400/10',
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-purple-500/20 dark:hover:bg-purple-400/20',
      ring: 'ring-purple-500',
    },
    pink: {
      bg: 'bg-pink-500/10 dark:bg-pink-400/10',
      text: 'text-pink-700 dark:text-pink-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-pink-500/20 dark:hover:bg-pink-400/20',
      ring: 'ring-pink-500',
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-400/10',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-transparent',
      hoverBg: 'hover:bg-rose-500/20 dark:hover:bg-rose-400/20',
      ring: 'ring-rose-500',
    },
  };

  return colorMap[color];
};

export const getNextTagColor = (existingTags: Tag[]): TagColor => {
  if (existingTags.length === 0) {
    return TAG_COLORS[0];
  }

  // Find least-used color
  const colorCounts = TAG_COLORS.reduce(
    (acc, color) => {
      acc[color] = existingTags.filter((tag) => tag.color === color).length;
      return acc;
    },
    {} as Record<TagColor, number>
  );

  const leastUsedColor = TAG_COLORS.reduce((min, color) =>
    colorCounts[color] < colorCounts[min] ? color : min
  );

  return leastUsedColor;
};

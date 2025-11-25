import { useMemo } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { LuRefreshCw, LuTriangleAlert, LuCircleAlert, LuCloudOff } from 'react-icons/lu';
import clsx from 'clsx';

type BadgeState = 'hidden' | 'syncing' | 'conflict' | 'error' | 'offline';

interface StatusBadgeProps {
  className?: string;
}

export const StatusBadge = ({ className }: StatusBadgeProps) => {
  const {
    isOnline,
    gitHubStatus,
    isSyncConflictModalOpen,
  } = useNotesStore();

  // Priority: Conflict > Error > Offline > Syncing > Hidden
  const state: BadgeState = useMemo(() => {
    if (isSyncConflictModalOpen) return 'conflict';
    if (gitHubStatus === 'error') return 'error';
    if (!isOnline) return 'offline';
    if (gitHubStatus === 'syncing') return 'syncing';
    return 'hidden';
  }, [isOnline, gitHubStatus, isSyncConflictModalOpen]);

  // Clean header when everything works
  if (state === 'hidden') {
    return null;
  }

  const stateConfig = {
    syncing: {
      icon: <LuRefreshCw className="w-3 h-3 animate-spin" />,
      label: 'Syncing',
      classes: clsx(
        'bg-blue-500/10 dark:bg-blue-400/15',
        'text-blue-700 dark:text-blue-300',
        'border-blue-200/40 dark:border-blue-500/30'
      ),
    },
    conflict: {
      icon: <LuTriangleAlert className="w-3 h-3" />,
      label: 'Conflict',
      classes: clsx(
        'bg-amber-500/15 dark:bg-amber-400/20',
        'text-amber-700 dark:text-amber-300',
        'border-amber-300/50 dark:border-amber-500/40'
      ),
    },
    error: {
      icon: <LuCircleAlert className="w-3 h-3" />,
      label: 'Error',
      classes: clsx(
        'bg-red-500/15 dark:bg-red-400/20',
        'text-red-700 dark:text-red-300',
        'border-red-300/50 dark:border-red-500/40'
      ),
    },
    offline: {
      icon: <LuCloudOff className="w-3 h-3" />,
      label: 'Offline',
      classes: clsx(
        'bg-stone-500/10 dark:bg-stone-400/15',
        'text-stone-600 dark:text-stone-400',
        'border-stone-300/40 dark:border-stone-600/30'
      ),
    },
  };

  const config = stateConfig[state];

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`Status: ${config.label}`}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md',
        'text-xs font-medium border backdrop-blur-sm',
        'transition-all duration-200',
        config.classes,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

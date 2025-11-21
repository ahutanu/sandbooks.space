import type { SandboxStatus } from '../../types';
import clsx from 'clsx';

interface SandboxStatusIndicatorProps {
  status: SandboxStatus;
  className?: string;
}

export const SandboxStatusIndicator = ({ status, className }: SandboxStatusIndicatorProps) => {
  // Status configurations with colors and labels
  const statusConfig = {
    healthy: {
      dotColor: 'bg-emerald-500',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      label: 'Ready',
      animate: false,
    },
    recovering: {
      dotColor: 'bg-amber-500',
      textColor: 'text-amber-700 dark:text-amber-400',
      label: 'Recovering...',
      animate: true,
    },
    unhealthy: {
      dotColor: 'bg-red-500',
      textColor: 'text-red-700 dark:text-red-400',
      label: 'Unavailable',
      animate: false,
    },
    creating: {
      dotColor: 'bg-blue-500',
      textColor: 'text-blue-700 dark:text-blue-400',
      label: 'Creating...',
      animate: true,
    },
    unknown: {
      dotColor: 'bg-stone-400',
      textColor: 'text-stone-500 dark:text-stone-400',
      label: 'Checking...',
      animate: false,
    },
  };

  const config = statusConfig[status];

  // Screen reader message
  const ariaLabel = `Sandbox status: ${config.label}`;

  return (
    <div
      className={clsx('flex items-center gap-1.5 text-xs', config.textColor, className)}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div
        className={clsx(
          'w-2 h-2 rounded-full',
          config.dotColor,
          config.animate && 'animate-pulse'
        )}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </div>
  );
};

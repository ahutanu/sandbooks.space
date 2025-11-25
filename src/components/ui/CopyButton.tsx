import React, { forwardRef, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { VscCopy, VscCheck } from 'react-icons/vsc';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { showToast } from '../../utils/toast';

export interface CopyButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onCopy'> {
  /** Text to copy (required) */
  text: string;
  /** Visual variant */
  variant?: 'default' | 'ghost' | 'icon-only';
  /** Button size */
  size?: 'sm' | 'md' | 'icon';
  /** Duration for success state (ms) */
  successDuration?: number;
  /** Callback after copy */
  onCopy?: (success: boolean) => void;
}

/**
 * Reusable copy button with smooth icon morph animation
 *
 * Features:
 * - Icon morphs from copy to checkmark on success
 * - Auto-reset after duration
 * - Accessible with aria-label and screen reader announcement
 * - Respects prefers-reduced-motion
 */
export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      text,
      variant = 'ghost',
      size = 'icon',
      successDuration = 1500,
      onCopy,
      className,
      disabled,
      'aria-label': ariaLabel,
      title,
      ...props
    },
    ref
  ) => {
    const announcementRef = useRef<HTMLDivElement>(null);

    const { copy, state } = useCopyToClipboard({
      successDuration,
      onSuccess: () => {
        onCopy?.(true);
      },
      onError: (error) => {
        showToast.error(error.message || 'Failed to copy');
        onCopy?.(false);
      },
    });

    // Screen reader announcement on success
    useEffect(() => {
      if (state === 'success' && announcementRef.current) {
        announcementRef.current.textContent = 'Copied to clipboard';
        // Clear after announcement
        const timeout = setTimeout(() => {
          if (announcementRef.current) {
            announcementRef.current.textContent = '';
          }
        }, 1000);
        return () => clearTimeout(timeout);
      }
    }, [state]);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      await copy(text);
    };

    const isSuccess = state === 'success';

    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      default: 'bg-stone-900 text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 shadow-sm hover:shadow-md',
      ghost: 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200',
      'icon-only': 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700/50',
    };

    const sizes = {
      sm: 'h-8 w-8 p-1.5',
      md: 'h-10 w-10 p-2',
      icon: 'h-10 w-10 p-2',
    };

    const iconSizes = {
      sm: 14,
      md: 18,
      icon: 18,
    };

    return (
      <>
        <button
          ref={ref}
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={clsx(
            baseStyles,
            variants[variant],
            sizes[size],
            isSuccess && 'text-emerald-500 dark:text-emerald-400',
            className
          )}
          aria-label={isSuccess ? 'Copied to clipboard' : (ariaLabel || 'Copy to clipboard')}
          title={isSuccess ? 'Copied!' : (title || 'Copy to clipboard')}
          data-state={state}
          {...props}
        >
          <span
            className={clsx(
              'transition-transform duration-200',
              // Spring animation via CSS
              'motion-reduce:transition-none'
            )}
            style={{
              transform: isSuccess ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {isSuccess ? (
              <VscCheck size={iconSizes[size]} aria-hidden="true" />
            ) : (
              <VscCopy size={iconSizes[size]} aria-hidden="true" />
            )}
          </span>
        </button>

        {/* Screen reader announcement */}
        <div
          ref={announcementRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
      </>
    );
  }
);

CopyButton.displayName = 'CopyButton';

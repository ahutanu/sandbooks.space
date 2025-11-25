import { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import clsx from 'clsx';
import { glassPanelVariants, backdropVariants } from '../../utils/animationVariants';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export const ConfirmDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element and focus the cancel button when opening
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus confirm button after animation
      requestAnimationFrame(() => {
        confirmButtonRef.current?.focus();
      });
    } else if (previousActiveElement.current) {
      // Return focus when closing
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab') {
        // Focus trap
        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isOpen, onCancel]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const variantStyles = {
    danger: {
      icon: (
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      confirmButton: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 text-white',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      confirmButton: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600 text-white',
    },
    default: {
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      confirmButton: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-600 text-white',
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
        >
          {/* Backdrop with Framer Motion */}
          <m.div
            className="absolute inset-0 glass-scrim"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Dialog with glass panel animation */}
          <m.div
            ref={dialogRef}
            className={clsx(
              'relative rounded-xl',
              // Use Liquid Glass overlay class for modals
              'glass-overlay',
              'w-full max-w-sm mx-4 p-6'
            )}
            variants={glassPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Inner glow overlay for glass depth */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/5 pointer-events-none" aria-hidden="true" />
            {/* Icon and content */}
            <div className="relative flex gap-4">
              <div className="flex-shrink-0">{styles.icon}</div>
              <div className="flex-1 min-w-0">
                <h2
                  id="confirm-dialog-title"
                  className="text-base font-semibold text-stone-900 dark:text-stone-100"
                >
                  {title}
                </h2>
                <p
                  id="confirm-dialog-message"
                  className="mt-2 text-sm text-stone-600 dark:text-stone-400"
                >
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="relative mt-6 flex gap-3 justify-end">
              <m.button
                onClick={onCancel}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg',
                  'text-stone-700 dark:text-stone-300',
                  'bg-stone-100 dark:bg-stone-800',
                  'hover:bg-stone-200 dark:hover:bg-stone-700',
                  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                  'transition-colors duration-fast'
                )}
                whileTap={{ scale: 0.97 }}
              >
                {cancelLabel}
              </m.button>
              <m.button
                ref={confirmButtonRef}
                onClick={onConfirm}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg',
                  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-offset-2',
                  'transition-colors duration-fast',
                  styles.confirmButton
                )}
                whileTap={{ scale: 0.97 }}
              >
                {confirmLabel}
              </m.button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};

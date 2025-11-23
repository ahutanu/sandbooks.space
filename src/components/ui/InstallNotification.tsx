/**
 * Install Notification Component
 *
 * Shows a subtle, non-intrusive notification when the app is installable but beforeinstallprompt hasn't fired yet.
 * Provides manual installation instructions as a fallback.
 * Respects user choice - once dismissed, stays dismissed forever.
 * 
 * Design Principles:
 * - Non-intrusive: Appears after user engagement, auto-dismisses
 * - Simple: Clear message, single dismiss action (handled by toast)
 * - Respectful: Never shows again after dismissal
 */

import { useEffect, useRef } from 'react';
import { isInstalled, isInstallable } from '../../utils/pwa';
import { showToast as toast } from '../../utils/toast';

export const InstallNotification = () => {
  const hasShownRef = useRef(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    // Early exit checks - don't proceed if conditions aren't met
    if (hasShownRef.current || dismissedRef.current) {
      return;
    }

    // Don't show if already installed
    if (isInstalled()) {
      return;
    }

    // Don't show if not installable
    if (!isInstallable()) {
      return;
    }

    // Check if previously dismissed (permanent dismissal)
    const dismissed = localStorage.getItem('sandbooks-install-notification-dismissed');
    if (dismissed === 'true') {
      dismissedRef.current = true;
      return;
    }

    // Wait for user engagement before showing (non-intrusive)
    const timer = setTimeout(() => {
      // Double-check dismissal state before showing
      const stillDismissed = localStorage.getItem('sandbooks-install-notification-dismissed');
      if (stillDismissed === 'true' || hasShownRef.current) {
        return;
      }

      hasShownRef.current = true;

      // Get browser-specific install instructions
      const getInstallInstructions = () => {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('chrome') || userAgent.includes('edge')) {
          return 'Click the install icon (⊕) in your browser\'s address bar to install Sandbooks';
        } else if (userAgent.includes('safari')) {
          return 'Click Share → Add to Home Screen to install Sandbooks';
        } else if (userAgent.includes('firefox')) {
          return 'Click the menu (☰) → Install to add Sandbooks to your device';
        }
        return 'Install Sandbooks from your browser menu for quick access';
      };

      // Mark as permanently dismissed function
      const markAsDismissed = () => {
        localStorage.setItem('sandbooks-install-notification-dismissed', 'true');
        dismissedRef.current = true;
      };

      // Show subtle toast notification
      // Note: react-hot-toast provides its own dismiss button, so we don't add one
      const toastId = toast.custom(
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
              {getInstallInstructions()}
            </p>
          </div>
        </div>,
        {
          id: 'install-notification',
          duration: 8000, // Auto-dismiss after 8 seconds (non-intrusive)
          position: 'top-right',
        }
      );

      // Mark as dismissed when toast auto-dismisses
      setTimeout(() => {
        markAsDismissed();
      }, 8000);

      // Also handle manual dismissal by finding the dismiss button and adding a click handler
      // Use a small delay to ensure the toast DOM is ready
      setTimeout(() => {
        // Find the dismiss button in the toast (react-hot-toast adds it)
        const toastContainer = document.querySelector(`[data-toast-id="${toastId}"]`) || 
                               document.querySelector(`[id*="toast-${toastId}"]`) ||
                               document.querySelector('[data-sonner-toast]');
        
        if (toastContainer) {
          const dismissButton = toastContainer.querySelector('button[aria-label="Dismiss"]') ||
                               toastContainer.querySelector('button[aria-label*="dismiss" i]') ||
                               toastContainer.querySelector('button:last-child');
          
          if (dismissButton) {
            const handleDismiss = () => {
              markAsDismissed();
              dismissButton.removeEventListener('click', handleDismiss);
            };
            dismissButton.addEventListener('click', handleDismiss, { once: true });
          }
        }
      }, 100);
    }, 10000); // Show after 10 seconds of usage

    return () => clearTimeout(timer);
  }, []);

  return null;
};


/**
 * Install Prompt Component
 *
 * Shows a beautiful install prompt when the browser indicates the app is installable.
 * Uses browser-native beforeinstallprompt event - no hacks, pure PWA standards.
 * Matches the design system with glass morphism and stone colors.
 */

import { useEffect, useState } from 'react';
import { isInstalled } from '../../utils/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalledState, setIsInstalledState] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsInstalledState(isInstalled());

    // Check if previously dismissed (respect user choice)
    const dismissed = localStorage.getItem('sandbooks-install-prompt-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Listen for browser's native beforeinstallprompt event
    // This is the ONLY way browsers indicate installability
    // Note: This event only fires when:
    // - App has valid manifest
    // - Service worker is registered
    // - Served over HTTPS (or localhost)
    // - User has engaged with the site
    // - App meets installability criteria
    const handleBeforeInstallPrompt = (e: Event) => {
      if (import.meta.env.DEV) {
        console.log('[PWA] beforeinstallprompt event fired - app is installable');
      }
      // Prevent browser's default install prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Log installability status for debugging (dev only)
    if (import.meta.env.DEV) {
      console.log('[PWA] InstallPrompt mounted, waiting for beforeinstallprompt event');
      console.log('[PWA] Service worker support:', 'serviceWorker' in navigator);
      console.log('[PWA] Already installed:', isInstalled());
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalledState(true);
      setDeferredPrompt(null);
      localStorage.setItem('sandbooks-install-prompt-dismissed', 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      // Show browser's native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalledState(true);
        localStorage.setItem('sandbooks-install-prompt-dismissed', 'true');
      } else {
        // User dismissed - respect their choice
        setIsDismissed(true);
        localStorage.setItem('sandbooks-install-prompt-dismissed', 'true');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error showing install prompt:', error);
      }
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('sandbooks-install-prompt-dismissed', 'true');
  };

  // Only show when:
  // - Browser has fired beforeinstallprompt (native installability signal)
  // - Not already installed
  // - Not previously dismissed
  if (!deferredPrompt || isInstalledState || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-fadeInSlideUp">
      <div className="glass-modal rounded-2xl p-6 shadow-elevation-4 border border-stone-200/20 dark:border-stone-700/20">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-700 to-stone-800 dark:from-stone-200 dark:to-stone-300 flex items-center justify-center shadow-elevation-2">
              <svg
                className="w-6 h-6 text-white dark:text-stone-800"
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
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-50 mb-1">
              Install Sandbooks
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4 leading-normal">
              Install Sandbooks as an app for quick access and a better experience.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 text-sm font-medium text-white dark:text-stone-900 bg-stone-800 dark:bg-stone-200 hover:bg-stone-900 dark:hover:bg-white rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Not now
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors duration-200"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};


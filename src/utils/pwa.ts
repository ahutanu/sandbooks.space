/**
 * PWA Utilities
 *
 * Handles service worker registration, updates, and offline/online state management.
 */

import { registerSW } from 'virtual:pwa-register';
import { showToast as toast } from './toast';
import { createElement } from 'react';

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

/**
 * Initialize PWA service worker registration
 */
export function initPWA(): void {
  if ('serviceWorker' in navigator) {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Show update notification when new version is available
        const handleReload = () => {
          updateSW?.(true);
          toast.dismiss('pwa-update');
        };
        const handleLater = () => {
          toast.dismiss('pwa-update');
        };

        toast.custom(
          createElement(
            'div',
            { className: 'flex items-center gap-3' },
            createElement(
              'span',
              { className: 'text-sm text-stone-800 dark:text-stone-200' },
              'New version available'
            ),
            createElement(
              'button',
              {
                onClick: handleReload,
                className: 'px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200',
              },
              'Reload'
            ),
            createElement(
              'button',
              {
                onClick: handleLater,
                className: 'px-3 py-1.5 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors duration-200',
              },
              'Later'
            )
          ),
          {
            id: 'pwa-update',
            duration: Infinity,
            position: 'top-right',
          }
        );
      },
      onOfflineReady() {
        toast.success('App ready for offline use', {
          position: 'top-right',
          duration: 3000,
        });
      },
      onRegistered(registration: ServiceWorkerRegistration | undefined) {
        if (registration && import.meta.env.DEV) {
          console.log('[PWA] Service Worker registered:', registration);
        }
      },
      onRegisterError(error: Error) {
        if (import.meta.env.DEV) {
          console.error('[PWA] Service Worker registration error:', error);
        }
      },
    });
  }
}

/**
 * Check if app is installed
 */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for standalone mode (iOS)
  if ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone) return true;
  
  // Check for display-mode standalone (other platforms)
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  
  return false;
}

/**
 * Check if app is installable (beforeinstallprompt event available)
 */
export function isInstallable(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}


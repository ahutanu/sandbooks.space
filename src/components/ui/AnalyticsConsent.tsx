/**
 * Analytics Consent Banner Component
 * 
 * Minimal, non-intrusive consent banner for Google Tag Manager.
 * Design principles:
 * - Opt-out by default: dismissing = accepting analytics
 * - Secondary option to explicitly disable analytics
 * - Once dismissed, choice is respected forever
 * - Follows design system: glass morphism, stone colors, minimal
 */

import { useEffect, useState } from 'react';
import { setAnalyticsConsent, hasConsentBeenGiven } from '../../utils/analytics';

export const AnalyticsConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDisableOption, setShowDisableOption] = useState(false);

  useEffect(() => {
    // Only show if consent hasn't been given
    if (!hasConsentBeenGiven()) {
      // Small delay to avoid showing immediately on page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    // Dismissing = accepting (opt-out by default)
    setAnalyticsConsent('accepted');
    setIsVisible(false);
    
    // If GTM wasn't loaded yet (consent was null), load it now
    const gtmId = import.meta.env.VITE_GOOGLE_TAG_MANAGER_TAG;
    if (gtmId && gtmId.trim() !== '' && gtmId.startsWith('G-') && typeof window !== 'undefined') {
      const win = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
      
      // Initialize dataLayer if not already done
      win.dataLayer = win.dataLayer || [];
      
      // Define gtag if not already defined
      if (!win.gtag) {
        win.gtag = function(...args: unknown[]) {
          win.dataLayer?.push(args);
        };
      }
      
      // Configure GTM
      win.gtag('js', new Date());
      win.gtag('config', gtmId);
      
      // Load GTM script if not already loaded (skip in test environment)
      const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gtmId}"]`);
      if (!existingScript && !import.meta.env.VITEST) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gtmId}`;
        document.head.appendChild(script);
      }
    }
  };

  const handleDisable = () => {
    // Explicitly disable analytics
    setAnalyticsConsent('disabled');
    setIsVisible(false);
    
    // Disable GTM immediately
    if (typeof window !== 'undefined') {
      const win = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
      
      // Disable gtag
      win.gtag = function() {};
      
      // Clear dataLayer
      if (win.dataLayer) {
        win.dataLayer.length = 0;
      }
      
      // Remove GTM scripts
      const scripts = document.querySelectorAll('script[src*="googletagmanager.com"]');
      scripts.forEach(script => script.remove());
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-md animate-fadeInSlideUp">
      <div className="glass-modal rounded-xl p-4 shadow-elevation-3 border border-stone-200/20 dark:border-stone-700/20">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-normal mb-3">
            Sandbooks wants to send minimal telemetry: feature usage and performance metrics, no personal content. This helps us prioritize fixes and improvements. No ads, no cross-site tracking, no creepy stuff.
          </p>

          {!showDisableOption ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-medium bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 hover:bg-stone-900 dark:hover:bg-white rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Accept
              </button>
              <button
                onClick={() => setShowDisableOption(true)}
                className="px-3 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-400 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Disable
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDisable}
                className="px-3 py-1.5 text-xs font-medium text-white bg-stone-700 dark:bg-stone-600 hover:bg-stone-800 dark:hover:bg-stone-500 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Disable Analytics
              </button>
              <button
                onClick={() => setShowDisableOption(false)}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


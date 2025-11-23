/**
 * Analytics Consent Management
 * 
 * Handles user consent for Google Tag Manager/analytics.
 * Default behavior: dismissing banner = accepting analytics (opt-out by default).
 * User can explicitly disable analytics via secondary option.
 * Choice is persisted forever in localStorage.
 */

const CONSENT_STORAGE_KEY = 'sandbooks-analytics-consent';

export type AnalyticsConsent = 'accepted' | 'disabled' | null;

/**
 * Get current analytics consent status
 */
export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (stored === 'accepted' || stored === 'disabled') {
    return stored;
  }
  
  return null;
}

/**
 * Set analytics consent status (persists forever)
 */
export function setAnalyticsConsent(consent: 'accepted' | 'disabled'): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.setItem(CONSENT_STORAGE_KEY, consent);
}

/**
 * Check if analytics is enabled (user has accepted)
 */
export function isAnalyticsEnabled(): boolean {
  return getAnalyticsConsent() === 'accepted';
}

/**
 * Check if consent has been given (either accepted or disabled)
 */
export function hasConsentBeenGiven(): boolean {
  return getAnalyticsConsent() !== null;
}

/**
 * Disable Google Tag Manager if consent is not accepted
 */
export function disableGoogleTagManager(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  const win = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  
  // Disable gtag function
  win.gtag = function() {
    // No-op: analytics disabled
  };
  
  // Clear dataLayer
  if (win.dataLayer) {
    win.dataLayer.length = 0;
  }
  
  // Remove any existing GTM scripts
  const scripts = document.querySelectorAll('script[src*="googletagmanager.com"]');
  scripts.forEach(script => script.remove());
}

/**
 * Initialize analytics based on consent
 */
export function initializeAnalytics(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  const consent = getAnalyticsConsent();
  
  if (consent === 'disabled') {
    disableGoogleTagManager();
  }
  // If consent is 'accepted' or null, GTM will load normally from index.html
}


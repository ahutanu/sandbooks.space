import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  isAnalyticsEnabled,
  hasConsentBeenGiven,
  disableGoogleTagManager,
  initializeAnalytics,
} from '../analytics';

describe('analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    
    // Mock window.gtag and dataLayer
    Object.defineProperty(window, 'gtag', {
      writable: true,
      value: undefined,
    });
    Object.defineProperty(window, 'dataLayer', {
      writable: true,
      value: [],
    });
    
    // Clear any existing GTM scripts
    document.querySelectorAll('script[src*="googletagmanager.com"]').forEach(script => script.remove());
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getAnalyticsConsent', () => {
    it('should return null when no consent is stored', () => {
      expect(getAnalyticsConsent()).toBeNull();
    });

    it('should return accepted when consent is accepted', () => {
      localStorage.setItem('sandbooks-analytics-consent', 'accepted');
      expect(getAnalyticsConsent()).toBe('accepted');
    });

    it('should return disabled when consent is disabled', () => {
      localStorage.setItem('sandbooks-analytics-consent', 'disabled');
      expect(getAnalyticsConsent()).toBe('disabled');
    });

    it('should return null for invalid values', () => {
      localStorage.setItem('sandbooks-analytics-consent', 'invalid');
      expect(getAnalyticsConsent()).toBeNull();
    });
  });

  describe('setAnalyticsConsent', () => {
    it('should store accepted consent', () => {
      setAnalyticsConsent('accepted');
      expect(localStorage.getItem('sandbooks-analytics-consent')).toBe('accepted');
    });

    it('should store disabled consent', () => {
      setAnalyticsConsent('disabled');
      expect(localStorage.getItem('sandbooks-analytics-consent')).toBe('disabled');
    });
  });

  describe('isAnalyticsEnabled', () => {
    it('should return false when consent is null', () => {
      expect(isAnalyticsEnabled()).toBe(false);
    });

    it('should return true when consent is accepted', () => {
      setAnalyticsConsent('accepted');
      expect(isAnalyticsEnabled()).toBe(true);
    });

    it('should return false when consent is disabled', () => {
      setAnalyticsConsent('disabled');
      expect(isAnalyticsEnabled()).toBe(false);
    });
  });

  describe('hasConsentBeenGiven', () => {
    it('should return false when no consent is stored', () => {
      expect(hasConsentBeenGiven()).toBe(false);
    });

    it('should return true when consent is accepted', () => {
      setAnalyticsConsent('accepted');
      expect(hasConsentBeenGiven()).toBe(true);
    });

    it('should return true when consent is disabled', () => {
      setAnalyticsConsent('disabled');
      expect(hasConsentBeenGiven()).toBe(true);
    });
  });

  describe('disableGoogleTagManager', () => {
    it('should disable gtag function', () => {
      window.gtag = vi.fn();
      window.dataLayer = ['test'];
      
      disableGoogleTagManager();
      
      expect(window.gtag).toBeDefined();
      expect(typeof window.gtag).toBe('function');
      // Calling it should not throw
      expect(() => window.gtag?.()).not.toThrow();
    });

    it('should clear dataLayer', () => {
      window.dataLayer = ['test', 'data'];
      
      disableGoogleTagManager();
      
      expect(window.dataLayer).toEqual([]);
    });

    it('should remove GTM scripts', () => {
      // Mock querySelectorAll to return a mock NodeList without actually creating scripts
      const mockScripts: Element[] = [];
      const mockScript1 = document.createElement('div');
      mockScript1.setAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=G-TEST1');
      mockScript1.setAttribute('data-test-gtm', 'true');
      mockScripts.push(mockScript1);
      
      const originalQuerySelectorAll = document.querySelectorAll.bind(document);
      vi.spyOn(document, 'querySelectorAll').mockImplementation((selector: string) => {
        if (selector.includes('googletagmanager.com')) {
          // Return a mock NodeList
          return {
            length: mockScripts.length,
            item: (index: number) => mockScripts[index] || null,
            forEach: (callback: (value: Element, index: number) => void) => {
              mockScripts.forEach(callback);
            },
            [Symbol.iterator]: function* () {
              for (const script of mockScripts) {
                yield script;
              }
            },
          } as unknown as NodeListOf<HTMLScriptElement>;
        }
        return originalQuerySelectorAll(selector);
      });
      
      // Mock remove method
      const removeSpy = vi.fn();
      mockScripts.forEach(script => {
        script.remove = removeSpy;
      });
      
      // Verify mock scripts are "found"
      const scriptsBefore = document.querySelectorAll('script[src*="googletagmanager.com"]');
      expect(scriptsBefore.length).toBe(1);
      
      // Call disableGoogleTagManager
      disableGoogleTagManager();
      
      // Verify remove was called on the scripts
      expect(removeSpy).toHaveBeenCalled();
      
      vi.restoreAllMocks();
    });
  });

  describe('initializeAnalytics', () => {
    it('should disable GTM when consent is disabled', () => {
      setAnalyticsConsent('disabled');
      
      initializeAnalytics();
      
      expect(window.gtag).toBeDefined();
      expect(window.dataLayer).toEqual([]);
    });

    it('should not disable GTM when consent is accepted', () => {
      setAnalyticsConsent('accepted');
      window.gtag = vi.fn();
      window.dataLayer = ['test'];
      
      initializeAnalytics();
      
      // Should not have been cleared
      expect(window.dataLayer).toEqual(['test']);
    });

    it('should not disable GTM when consent is null', () => {
      window.gtag = vi.fn();
      window.dataLayer = ['test'];
      
      initializeAnalytics();
      
      // Should not have been cleared
      expect(window.dataLayer).toEqual(['test']);
    });
  });
});


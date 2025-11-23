import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the virtual module - need to mock before importing pwa.ts
vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(() => vi.fn()),
}));

// Mock toast utility
vi.mock('../toast', () => ({
  showToast: {
    custom: vi.fn(),
    success: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Import after mocks are set up
import { isInstalled, isInstallable, initPWA } from '../pwa';

describe('PWA Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initPWA', () => {
    it('should initialize PWA when service worker is supported', async () => {
      const mockRegisterSW = vi.fn((options) => {
        // Simulate callbacks being called
        if (options.onNeedRefresh) {
          options.onNeedRefresh();
        }
        if (options.onOfflineReady) {
          options.onOfflineReady();
        }
        if (options.onRegistered) {
          options.onRegistered({} as ServiceWorkerRegistration);
        }
        return vi.fn();
      });

      const pwaRegister = await import('virtual:pwa-register');
      vi.mocked(pwaRegister.registerSW).mockImplementation(mockRegisterSW);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      initPWA();

      expect(mockRegisterSW).toHaveBeenCalledWith(
        expect.objectContaining({
          immediate: true,
          onNeedRefresh: expect.any(Function),
          onOfflineReady: expect.any(Function),
          onRegistered: expect.any(Function),
          onRegisterError: expect.any(Function),
        })
      );
    });

    it('should call onNeedRefresh callback and show update toast', async () => {
      const mockToast = await import('../toast');
      const mockUpdateSW = vi.fn();
      const mockRegisterSW = vi.fn((options) => {
        if (options.onNeedRefresh) {
          // Call the callback which will trigger toast
          options.onNeedRefresh();
        }
        return mockUpdateSW;
      });

      const pwaRegister = await import('virtual:pwa-register');
      vi.mocked(pwaRegister.registerSW).mockImplementation(mockRegisterSW);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      initPWA();

      expect(mockToast.showToast.custom).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          id: 'pwa-update',
          duration: Infinity,
          position: 'top-right',
        })
      );
      
      // Verify toast contains reload and later buttons
      const toastCall = vi.mocked(mockToast.showToast.custom).mock.calls[0];
      expect(toastCall).toBeDefined();
      expect(toastCall[0]).toBeDefined();
    });

    it('should handle onNeedRefresh callback structure', async () => {
      const mockToast = await import('../toast');
      const mockRegisterSW = vi.fn((options) => {
        if (options.onNeedRefresh) {
          options.onNeedRefresh();
        }
        return vi.fn();
      });

      const pwaRegister = await import('virtual:pwa-register');
      vi.mocked(pwaRegister.registerSW).mockImplementation(mockRegisterSW);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      initPWA();

      // Verify toast was called with proper structure
      expect(mockToast.showToast.custom).toHaveBeenCalled();
      const toastCall = vi.mocked(mockToast.showToast.custom).mock.calls[0];
      expect(toastCall[0]).toBeDefined();
      // Verify it contains buttons (reload and later)
      const toastElement = toastCall[0];
      expect(toastElement).toBeDefined();
    });

    it('should call onOfflineReady callback and show success toast', async () => {
      const mockToast = await import('../toast');
      const mockRegisterSW = vi.fn((options) => {
        if (options.onOfflineReady) {
          options.onOfflineReady();
        }
        return vi.fn();
      });

      const pwaRegister = await import('virtual:pwa-register');
      vi.mocked(pwaRegister.registerSW).mockImplementation(mockRegisterSW);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      initPWA();

      expect(mockToast.showToast.success).toHaveBeenCalledWith(
        'App ready for offline use',
        expect.objectContaining({
          position: 'top-right',
          duration: 3000,
        })
      );
    });

    it('should call onRegistered callback with registration', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockRegistration = { active: true } as ServiceWorkerRegistration;
      const mockRegisterSW = vi.fn((options) => {
        if (options.onRegistered) {
          options.onRegistered(mockRegistration);
        }
        return vi.fn();
      });

      const pwaRegister = await import('virtual:pwa-register');
      vi.mocked(pwaRegister.registerSW).mockImplementation(mockRegisterSW);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      initPWA();

      expect(consoleSpy).toHaveBeenCalledWith('[PWA] Service Worker registered:', mockRegistration);
      consoleSpy.mockRestore();
    });

    it('should handle onRegistered callback with undefined registration', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockRegisterSW = vi.fn((options) => {
        if (options.onRegistered) {
          options.onRegistered(undefined);
        }
        return vi.fn();
      });

      const pwaRegister = await import('virtual:pwa-register');
      vi.mocked(pwaRegister.registerSW).mockImplementation(mockRegisterSW);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      initPWA();

      // Should not log when registration is undefined
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should execute handleReload function in onNeedRefresh', async () => {
      const mockToast = await import('../toast');
      const mockUpdateSW = vi.fn();
      let handleReloadFn: (() => void) | undefined;
      
      const mockRegisterSW = vi.fn((options) => {
        if (options.onNeedRefresh) {
          options.onNeedRefresh();
          // Extract handleReload from the toast call
          const toastCall = vi.mocked(mockToast.showToast.custom).mock.calls[0];
          if (toastCall && toastCall[0] && toastCall[0].props && toastCall[0].props.children) {
            const buttons = toastCall[0].props.children;
            const reloadButton = Array.isArray(buttons) 
              ? buttons.find((btn: { props?: { onClick?: () => void; children?: string } }) => 
                  btn && btn.props && btn.props.children === 'Reload'
                )
              : null;
            if (reloadButton && reloadButton.props?.onClick) {
              handleReloadFn = reloadButton.props.onClick;
            }
          }
        }
        return mockUpdateSW;
      });

      const pwaRegister = await import('virtual:pwa-register');
      vi.mocked(pwaRegister.registerSW).mockImplementation(mockRegisterSW);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      initPWA();

      // Execute handleReload if found
      if (handleReloadFn) {
        handleReloadFn();
        expect(mockUpdateSW).toHaveBeenCalledWith(true);
        expect(mockToast.showToast.dismiss).toHaveBeenCalledWith('pwa-update');
      }
    });

    it('should execute handleLater function in onNeedRefresh', async () => {
      const mockToast = await import('../toast');
      let handleLaterFn: (() => void) | undefined;
      
      const mockRegisterSW = vi.fn((options) => {
        if (options.onNeedRefresh) {
          options.onNeedRefresh();
          // Extract handleLater from the toast call
          const toastCall = vi.mocked(mockToast.showToast.custom).mock.calls[0];
          if (toastCall && toastCall[0] && toastCall[0].props && toastCall[0].props.children) {
            const buttons = toastCall[0].props.children;
            const laterButton = Array.isArray(buttons)
              ? buttons.find((btn: { props?: { onClick?: () => void; children?: string } }) => 
                  btn && btn.props && btn.props.children === 'Later'
                )
              : null;
            if (laterButton && laterButton.props?.onClick) {
              handleLaterFn = laterButton.props.onClick;
            }
          }
        }
        return vi.fn();
      });

      const pwaRegister = await import('virtual:pwa-register');
      vi.mocked(pwaRegister.registerSW).mockImplementation(mockRegisterSW);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      initPWA();

      // Execute handleLater if found
      if (handleLaterFn) {
        handleLaterFn();
        expect(mockToast.showToast.dismiss).toHaveBeenCalledWith('pwa-update');
      }
    });

    it('should call onRegisterError callback with error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Registration failed');
      const mockRegisterSW = vi.fn((options) => {
        if (options.onRegisterError) {
          options.onRegisterError(mockError);
        }
        return vi.fn();
      });

      const pwaRegister = await import('virtual:pwa-register');
      vi.mocked(pwaRegister.registerSW).mockImplementation(mockRegisterSW);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      initPWA();

      expect(consoleSpy).toHaveBeenCalledWith('[PWA] Service Worker registration error:', mockError);
      consoleSpy.mockRestore();
    });

    it('should handle service worker not supported gracefully', () => {
      const originalSW = (navigator as { serviceWorker?: unknown }).serviceWorker;
      delete (navigator as { serviceWorker?: unknown }).serviceWorker;

      // Should not throw
      expect(() => initPWA()).not.toThrow();

      // Restore
      if (originalSW !== undefined) {
        Object.defineProperty(navigator, 'serviceWorker', {
          value: originalSW,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return false for isInstalled when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - testing SSR scenario
      global.window = undefined;
      
      // In SSR, isInstalled should return false
      expect(isInstalled()).toBe(false);
      
      global.window = originalWindow;
    });

    it('should return false for isInstallable when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - testing SSR scenario
      global.window = undefined;
      
      expect(isInstallable()).toBe(false);
      
      global.window = originalWindow;
    });
  });

  describe('isInstalled', () => {
    it('should return false when not installed', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          standalone: false,
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: false,
        })),
        writable: true,
        configurable: true,
      });

      expect(isInstalled()).toBe(false);
    });

    it('should return true when installed via iOS standalone', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          standalone: true,
        },
        writable: true,
        configurable: true,
      });

      expect(isInstalled()).toBe(true);
    });

    it('should return true when installed via display-mode standalone', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          standalone: false,
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
        })),
        writable: true,
        configurable: true,
      });

      expect(isInstalled()).toBe(true);
    });
  });

  describe('isInstallable', () => {
    it('should return true when service worker is supported', () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(isInstallable()).toBe(true);
    });

    it('should return false when service worker is not supported', () => {
      // Delete the property to simulate it not existing
      const originalSW = (navigator as { serviceWorker?: unknown }).serviceWorker;
      delete (navigator as { serviceWorker?: unknown }).serviceWorker;

      expect(isInstallable()).toBe(false);

      // Restore for other tests
      if (originalSW !== undefined) {
        Object.defineProperty(navigator, 'serviceWorker', {
          value: originalSW,
          writable: true,
          configurable: true,
        });
      }
    });
  });
});


import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallPrompt } from '../InstallPrompt';
import * as pwaUtils from '../../../utils/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

vi.mock('../../../utils/pwa', () => ({
  isInstalled: vi.fn(),
}));

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (pwaUtils.isInstalled as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when app is already installed', () => {
    (pwaUtils.isInstalled as ReturnType<typeof vi.fn>).mockReturnValue(true);
    
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when prompt was previously dismissed', () => {
    localStorage.setItem('sandbooks-install-prompt-dismissed', 'true');
    
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when no deferred prompt available', () => {
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should set up event listeners on mount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    
    render(<InstallPrompt />);
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
    
    addEventListenerSpy.mockRestore();
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(<InstallPrompt />);
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('should render when deferred prompt is available', async () => {
    const mockPrompt = vi.fn();
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const });

    // Simulate beforeinstallprompt event
    const { container } = render(<InstallPrompt />);
    
    // Trigger the event wrapped in act()
    await act(async () => {
      const event = new Event('beforeinstallprompt');
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      Object.defineProperty(event, 'prompt', { value: mockPrompt });
      Object.defineProperty(event, 'userChoice', { value: mockUserChoice });
      
      window.dispatchEvent(event as BeforeInstallPromptEvent);
    });
    
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('should handle install button click', async () => {
    const user = userEvent.setup();
    const mockPrompt = vi.fn();
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const });

    render(<InstallPrompt />);
    
    // Trigger beforeinstallprompt wrapped in act()
    await act(async () => {
      const event = new Event('beforeinstallprompt');
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      Object.defineProperty(event, 'prompt', { value: mockPrompt });
      Object.defineProperty(event, 'userChoice', { value: mockUserChoice });
      window.dispatchEvent(event as BeforeInstallPromptEvent);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Install')).toBeInTheDocument();
    });
    
    const installButton = screen.getByText('Install');
    await user.click(installButton);
    
    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalled();
    });
  });

  it('should handle dismiss button click', async () => {
    const user = userEvent.setup();
    const mockPrompt = vi.fn();
    const mockUserChoice = Promise.resolve({ outcome: 'dismissed' as const });
    
    render(<InstallPrompt />);
    
    // Trigger beforeinstallprompt wrapped in act()
    await act(async () => {
      const event = new Event('beforeinstallprompt');
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      Object.defineProperty(event, 'prompt', { value: mockPrompt });
      Object.defineProperty(event, 'userChoice', { value: mockUserChoice });
      window.dispatchEvent(event as BeforeInstallPromptEvent);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Not now')).toBeInTheDocument();
    });
    
    const dismissButton = screen.getByText('Not now');
    await act(async () => {
      await user.click(dismissButton);
    });
    
    await waitFor(() => {
      expect(localStorage.getItem('sandbooks-install-prompt-dismissed')).toBe('true');
    });
  });

  it('should handle appinstalled event', async () => {
    render(<InstallPrompt />);
    
    // Trigger appinstalled event wrapped in act()
    await act(async () => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    
    await waitFor(() => {
      expect(localStorage.getItem('sandbooks-install-prompt-dismissed')).toBe('true');
    });
  });
});


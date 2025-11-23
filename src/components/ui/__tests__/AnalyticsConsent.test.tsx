import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyticsConsent } from '../AnalyticsConsent';
import * as analyticsUtils from '../../../utils/analytics';

vi.mock('../../../utils/analytics', () => ({
  getAnalyticsConsent: vi.fn(),
  setAnalyticsConsent: vi.fn(),
  hasConsentBeenGiven: vi.fn(),
}));

// Mock environment variable
vi.mock('import.meta', () => ({
  env: {
    VITE_GOOGLE_TAG_MANAGER_TAG: 'G-PBL9TB7JT2',
  },
}));

describe('AnalyticsConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (analyticsUtils.hasConsentBeenGiven as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (analyticsUtils.getAnalyticsConsent as ReturnType<typeof vi.fn>).mockReturnValue(null);
    
    // Mock window.gtag and dataLayer
    Object.defineProperty(window, 'gtag', {
      writable: true,
      value: undefined,
    });
    Object.defineProperty(window, 'dataLayer', {
      writable: true,
      value: [],
    });
    
    // Mock document.head.appendChild to prevent actual script loading in tests
    const originalAppendChild = document.head.appendChild.bind(document.head);
    vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
      // Skip appending script elements to prevent network requests
      if (node instanceof HTMLScriptElement && node.src.includes('googletagmanager.com')) {
        return node;
      }
      return originalAppendChild(node);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when consent has already been given', () => {
    (analyticsUtils.hasConsentBeenGiven as ReturnType<typeof vi.fn>).mockReturnValue(true);
    
    const { container } = render(<AnalyticsConsent />);
    expect(container.firstChild).toBeNull();
  });

  it('should render after a delay when consent has not been given', async () => {
    const { container } = render(<AnalyticsConsent />);
    
    // Should not be visible immediately
    expect(container.firstChild).toBeNull();
    
    // Wait for the delay (1000ms) plus a small buffer
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    }, { timeout: 2000 });
  });

  it('should show accept and disable buttons initially', async () => {
    render(<AnalyticsConsent />);
    
    await waitFor(() => {
      expect(screen.getByText('Accept')).toBeInTheDocument();
      expect(screen.getByText('Disable')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should accept analytics when accept button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<AnalyticsConsent />);
    
    await waitFor(() => {
      expect(screen.getByText('Accept')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    const acceptButton = screen.getByText('Accept');
    await act(async () => {
      await user.click(acceptButton);
    });
    
    expect(analyticsUtils.setAnalyticsConsent).toHaveBeenCalledWith('accepted');
  });

  it('should show disable option when disable button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<AnalyticsConsent />);
    
    await waitFor(() => {
      expect(screen.getByText('Disable')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    const disableButton = screen.getByText('Disable');
    await act(async () => {
      await user.click(disableButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Disable Analytics')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('should disable analytics when disable analytics button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<AnalyticsConsent />);
    
    await waitFor(() => {
      expect(screen.getByText('Disable')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Click disable to show confirmation
    const disableButton = screen.getByText('Disable');
    await act(async () => {
      await user.click(disableButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Disable Analytics')).toBeInTheDocument();
    });
    
    // Click disable analytics
    const disableAnalyticsButton = screen.getByText('Disable Analytics');
    await act(async () => {
      await user.click(disableAnalyticsButton);
    });
    
    expect(analyticsUtils.setAnalyticsConsent).toHaveBeenCalledWith('disabled');
  });

  it('should cancel disable option when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<AnalyticsConsent />);
    
    await waitFor(() => {
      expect(screen.getByText('Disable')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Click disable to show confirmation
    const disableButton = screen.getByText('Disable');
    await act(async () => {
      await user.click(disableButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
    
    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    await act(async () => {
      await user.click(cancelButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Accept')).toBeInTheDocument();
      expect(screen.getByText('Disable')).toBeInTheDocument();
    });
  });

  it('should accept analytics via close button', async () => {
    const user = userEvent.setup();
    
    render(<AnalyticsConsent />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Accept')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    const closeButton = screen.getByLabelText('Accept');
    await act(async () => {
      await user.click(closeButton);
    });
    
    expect(analyticsUtils.setAnalyticsConsent).toHaveBeenCalledWith('accepted');
  });
});

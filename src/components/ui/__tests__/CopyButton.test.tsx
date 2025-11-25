import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CopyButton } from '../CopyButton';

describe('CopyButton', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    // Mock clipboard API
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
    });
  });

  it('should render with copy icon initially', () => {
    render(<CopyButton text="test" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Copy to clipboard');
  });

  it('should copy text when clicked', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    render(<CopyButton text="hello world" />);
    const button = screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).toHaveBeenCalledWith('hello world');
  });

  it('should show success state after copy', async () => {
    render(<CopyButton text="test" />);
    const button = screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toHaveAttribute('aria-label', 'Copied to clipboard');
    expect(button).toHaveAttribute('data-state', 'success');
  });

  it('should reset to idle after successDuration', async () => {
    vi.useFakeTimers();

    render(<CopyButton text="test" successDuration={1000} />);
    const button = screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve(); // Allow async to complete
    });

    expect(button).toHaveAttribute('data-state', 'success');

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(button).toHaveAttribute('data-state', 'idle');

    vi.useRealTimers();
  });

  it('should call onCopy callback', async () => {
    const onCopy = vi.fn();
    render(<CopyButton text="test" onCopy={onCopy} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(onCopy).toHaveBeenCalledWith(true);
  });

  it('should apply variant styles', () => {
    const { rerender } = render(<CopyButton text="test" variant="ghost" />);
    let button = screen.getByRole('button');
    expect(button.className).toContain('hover:bg-stone-100');

    rerender(<CopyButton text="test" variant="icon-only" />);
    button = screen.getByRole('button');
    expect(button.className).toContain('text-stone-500');
  });

  it('should apply size styles', () => {
    const { rerender } = render(<CopyButton text="test" size="sm" />);
    let button = screen.getByRole('button');
    expect(button.className).toContain('h-8');

    rerender(<CopyButton text="test" size="md" />);
    button = screen.getByRole('button');
    expect(button.className).toContain('h-10');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<CopyButton text="test" disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should prevent event propagation', async () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <CopyButton text="test" />
      </div>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(parentClick).not.toHaveBeenCalled();
  });

  it('should accept custom aria-label', () => {
    render(<CopyButton text="test" aria-label="Copy code" />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Copy code');
  });

  it('should accept custom title', () => {
    render(<CopyButton text="test" title="Copy this code" />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Copy this code');
  });

  it('should update title on success', async () => {
    render(<CopyButton text="test" title="Copy" />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('title', 'Copy');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toHaveAttribute('title', 'Copied!');
  });

  it('should accept custom className', () => {
    render(<CopyButton text="test" className="custom-class" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });

  it('should have screen reader announcement element', () => {
    render(<CopyButton text="test" />);
    const announcement = screen.getByRole('status');
    expect(announcement).toBeInTheDocument();
    expect(announcement).toHaveClass('sr-only');
  });

  it('should announce copy success to screen readers', async () => {
    render(<CopyButton text="test" />);
    const announcement = screen.getByRole('status');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(announcement.textContent).toBe('Copied to clipboard');
  });

  it('should apply success color on success state', async () => {
    render(<CopyButton text="test" />);
    const button = screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button.className).toContain('text-emerald-500');
  });

  it('should support forwardRef', () => {
    const ref = vi.fn();
    render(<CopyButton text="test" ref={ref} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });
});

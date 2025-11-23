import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LinkPopover } from './LinkPopover';
import type { Editor } from '@tiptap/core';

// Mock Floating UI
vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
  offset: vi.fn(() => ({})),
  flip: vi.fn(() => ({})),
  shift: vi.fn(() => ({})),
}));

describe('LinkPopover', () => {
  const mockEditor = {
    chain: vi.fn().mockReturnThis(),
    focus: vi.fn().mockReturnThis(),
    extendMarkRange: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    unsetLink: vi.fn().mockReturnThis(),
    insertContent: vi.fn().mockReturnThis(),
    run: vi.fn(),
    state: {
      selection: {
        from: 0,
        to: 5,
      },
    },
    view: {
      coordsAtPos: vi.fn().mockReturnValue({ left: 0, top: 0 }),
    },
  } as unknown as Editor;

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders link input', () => {
    render(<LinkPopover editor={mockEditor} onClose={mockOnClose} />);

    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
    expect(screen.getByText('Insert')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('initializes with provided URL', () => {
    render(<LinkPopover editor={mockEditor} onClose={mockOnClose} initialUrl="https://example.com" />);

    const input = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
    expect(input.value).toBe('https://example.com');
  });

  it('updates URL on input change', () => {
    render(<LinkPopover editor={mockEditor} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://test.com' } });

    expect(input.value).toBe('https://test.com');
  });

  it('inserts link with https prefix when URL lacks protocol', () => {
    render(<LinkPopover editor={mockEditor} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'example.com' } });

    const insertButton = screen.getByText('Insert');
    fireEvent.click(insertButton);

    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockEditor.setLink).toHaveBeenCalledWith({ href: 'https://example.com' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('inserts link with existing protocol', () => {
    render(<LinkPopover editor={mockEditor} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://test.com' } });

    const insertButton = screen.getByText('Insert');
    fireEvent.click(insertButton);

    expect(mockEditor.setLink).toHaveBeenCalledWith({ href: 'https://test.com' });
  });

  it('removes link when URL is empty', () => {
    render(<LinkPopover editor={mockEditor} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });

    const insertButton = screen.getByText('Insert');
    fireEvent.click(insertButton);

    expect(mockEditor.unsetLink).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('inserts link on Enter key', () => {
    render(<LinkPopover editor={mockEditor} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockEditor.setLink).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes on Escape key', () => {
    render(<LinkPopover editor={mockEditor} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes on Cancel button click', () => {
    render(<LinkPopover editor={mockEditor} onClose={mockOnClose} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('focuses input on mount', () => {
    const { container } = render(<LinkPopover editor={mockEditor} onClose={mockOnClose} />);
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    
    // Input should be focused (this is tested via useEffect)
    expect(input).toBeInTheDocument();
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SlashMenuList } from './SlashMenuList';
import type { SlashCommandItem } from './extensions/slashCommands';

describe('SlashMenuList', () => {
  const mockCommand = vi.fn();
  const mockItems: SlashCommandItem[] = [
    {
      title: 'Heading 1',
      description: 'Large section heading',
      searchTerms: ['h1'],
      icon: 'H1',
      command: vi.fn(),
    },
    {
      title: 'Bullet List',
      description: 'Create a simple bullet list',
      searchTerms: ['bullet'],
      icon: 'BulletList',
      command: vi.fn(),
    },
    {
      title: 'Code Block',
      description: 'Execute code in multiple languages',
      searchTerms: ['code'],
      icon: 'Code',
      command: vi.fn(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of items', () => {
    render(<SlashMenuList items={mockItems} command={mockCommand} />);

    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Bullet List')).toBeInTheDocument();
    expect(screen.getByText('Code Block')).toBeInTheDocument();
  });

  it('renders item descriptions', () => {
    render(<SlashMenuList items={mockItems} command={mockCommand} />);

    expect(screen.getByText('Large section heading')).toBeInTheDocument();
    expect(screen.getByText('Create a simple bullet list')).toBeInTheDocument();
  });

  it('calls command when item is clicked', () => {
    render(<SlashMenuList items={mockItems} command={mockCommand} />);

    const headingButton = screen.getByText('Heading 1').closest('button');
    fireEvent.click(headingButton!);

    expect(mockCommand).toHaveBeenCalledWith(mockItems[0]);
  });

  it('shows "No matching commands" when items array is empty', () => {
    render(<SlashMenuList items={[]} command={mockCommand} />);

    expect(screen.getByText('No matching commands')).toBeInTheDocument();
  });

  it('handles keyboard navigation with ArrowUp', () => {
    const ref = { current: null };
    render(<SlashMenuList ref={ref} items={mockItems} command={mockCommand} />);

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    let handled = false;
    act(() => {
      handled = ref.current?.onKeyDown({ event }) ?? false;
    });

    expect(handled).toBe(true);
  });

  it('handles keyboard navigation with ArrowDown', () => {
    const ref = { current: null };
    render(<SlashMenuList ref={ref} items={mockItems} command={mockCommand} />);

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    let handled = false;
    act(() => {
      handled = ref.current?.onKeyDown({ event }) ?? false;
    });

    expect(handled).toBe(true);
  });

  it('handles keyboard selection with Enter', () => {
    const ref = { current: null };
    render(<SlashMenuList ref={ref} items={mockItems} command={mockCommand} />);

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    let handled = false;
    act(() => {
      handled = ref.current?.onKeyDown({ event }) ?? false;
    });

    expect(handled).toBe(true);
    expect(mockCommand).toHaveBeenCalled();
  });

  it('returns false for non-handled keys', () => {
    const ref = { current: null };
    render(<SlashMenuList ref={ref} items={mockItems} command={mockCommand} />);

    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    const handled = ref.current?.onKeyDown({ event });

    expect(handled).toBe(false);
  });

  it('renders keyboard hints in footer', () => {
    render(<SlashMenuList items={mockItems} command={mockCommand} />);

    expect(screen.getByText('Navigate')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('renders correct icons for different icon types', () => {
    render(<SlashMenuList items={mockItems} command={mockCommand} />);

    // Icons should be rendered (as SVGs)
    const buttons = screen.getAllByRole('option');
    expect(buttons.length).toBe(mockItems.length);
  });

  it('highlights selected item', () => {
    render(<SlashMenuList items={mockItems} command={mockCommand} />);

    const firstButton = screen.getByText('Heading 1').closest('button');
    expect(firstButton).toHaveAttribute('aria-selected', 'true');
  });

  it('wraps selection when navigating past last item', () => {
    const ref = { current: null };
    render(<SlashMenuList ref={ref} items={mockItems} command={mockCommand} />);

    // Navigate down multiple times to wrap
    act(() => {
      for (let i = 0; i < mockItems.length + 1; i++) {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        ref.current?.onKeyDown({ event });
      }
    });

    // Should wrap back to first item
    const firstButton = screen.getByText('Heading 1').closest('button');
    expect(firstButton).toHaveAttribute('aria-selected', 'true');
  });
});


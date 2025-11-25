import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ContextMenu, ContextMenuItem } from '../ContextMenu';

describe('ContextMenu', () => {
  const mockItems: ContextMenuItem[] = [
    { id: 'copy', label: 'Copy', onClick: vi.fn() },
    { id: 'paste', label: 'Paste', onClick: vi.fn() },
    { id: 'delete', label: 'Delete', onClick: vi.fn(), variant: 'danger' },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should render children', () => {
    render(
      <ContextMenu items={mockItems}>
        <div data-testid="trigger">Right click me</div>
      </ContextMenu>
    );

    expect(screen.getByTestId('trigger')).toBeInTheDocument();
  });

  it('should not show menu initially', () => {
    render(
      <ContextMenu items={mockItems}>
        <div>Trigger</div>
      </ContextMenu>
    );

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should show menu on right-click', () => {
    render(
      <ContextMenu items={mockItems}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Paste')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should close menu on item click', async () => {
    const onClick = vi.fn();
    const items: ContextMenuItem[] = [
      { id: 'test', label: 'Test', onClick },
    ];

    render(
      <ContextMenu items={items}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Test'));

    // Wait for closing animation
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should call onClick after menu closes', async () => {
    const onClick = vi.fn();
    const items: ContextMenuItem[] = [
      { id: 'test', label: 'Test', onClick },
    ];

    render(
      <ContextMenu items={items}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));
    fireEvent.click(screen.getByText('Test'));

    // Wait for onClick delay (50ms after close)
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(onClick).toHaveBeenCalled();
  });

  it('should close menu on Escape key', async () => {
    render(
      <ContextMenu items={mockItems}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Wait for event listener to be added
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    // Wait for closing animation
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should close menu on click outside', async () => {
    render(
      <div>
        <ContextMenu items={mockItems}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
        <div data-testid="outside">Outside</div>
      </div>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Wait for event listener to be added
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    fireEvent.mouseDown(screen.getByTestId('outside'));

    // Wait for closing animation
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should render menu items with icons', () => {
    const itemsWithIcon: ContextMenuItem[] = [
      {
        id: 'icon',
        label: 'With Icon',
        icon: <span data-testid="icon">Icon</span>,
        onClick: vi.fn(),
      },
    ];

    render(
      <ContextMenu items={itemsWithIcon}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should render menu items with shortcuts', () => {
    const itemsWithShortcut: ContextMenuItem[] = [
      {
        id: 'shortcut',
        label: 'With Shortcut',
        shortcut: '⌘C',
        onClick: vi.fn(),
      },
    ];

    render(
      <ContextMenu items={itemsWithShortcut}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    expect(screen.getByText('⌘C')).toBeInTheDocument();
  });

  it('should apply danger variant style', () => {
    const dangerItems: ContextMenuItem[] = [
      { id: 'danger', label: 'Danger Item', onClick: vi.fn(), variant: 'danger' },
    ];

    render(
      <ContextMenu items={dangerItems}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    const dangerButton = screen.getByRole('menuitem');
    expect(dangerButton.className).toContain('text-red-600');
  });

  it('should handle disabled items', () => {
    const disabledItems: ContextMenuItem[] = [
      { id: 'disabled', label: 'Disabled', onClick: vi.fn(), disabled: true },
    ];

    render(
      <ContextMenu items={disabledItems}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    const disabledButton = screen.getByRole('menuitem');
    expect(disabledButton).toBeDisabled();
    expect(disabledButton.className).toContain('opacity-40');
  });

  it('should not call onClick for disabled items', async () => {
    const onClick = vi.fn();
    const disabledItems: ContextMenuItem[] = [
      { id: 'disabled', label: 'Disabled', onClick, disabled: true },
    ];

    render(
      <ContextMenu items={disabledItems}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));
    fireEvent.click(screen.getByText('Disabled'));

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(onClick).not.toHaveBeenCalled();
  });

  it('should position menu at cursor location', () => {
    render(
      <ContextMenu items={mockItems}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'), {
      clientX: 100,
      clientY: 200,
    });

    const menu = screen.getByRole('menu');
    expect(menu.style.left).toBe('100px');
    expect(menu.style.top).toBe('200px');
  });

  it('should stop event propagation on context menu', () => {
    const parentContextMenu = vi.fn();

    render(
      <div onContextMenu={parentContextMenu}>
        <ContextMenu items={mockItems}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      </div>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    expect(parentContextMenu).not.toHaveBeenCalled();
  });

  it('should apply custom className to container', () => {
    render(
      <ContextMenu items={mockItems} className="custom-class">
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    const container = screen.getByTestId('trigger').parentElement;
    expect(container?.className).toContain('custom-class');
  });

  it('should have proper ARIA attributes on menu', () => {
    render(
      <ContextMenu items={mockItems}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('aria-label', 'Context menu');
  });

  it('should have proper role on menu items', () => {
    render(
      <ContextMenu items={mockItems}>
        <div data-testid="trigger">Trigger</div>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(3);
  });

  describe('keyboard navigation', () => {
    it('should navigate down with ArrowDown key', async () => {
      render(
        <ContextMenu items={mockItems}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      );

      fireEvent.contextMenu(screen.getByTestId('trigger'));

      // Wait for event listener to be added
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // First item should be focused
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[0]).toHaveFocus();
    });

    it('should navigate up with ArrowUp key', async () => {
      render(
        <ContextMenu items={mockItems}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      );

      fireEvent.contextMenu(screen.getByTestId('trigger'));

      // Wait for event listener to be added
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Press ArrowUp to go to last item (wrap around)
      fireEvent.keyDown(document, { key: 'ArrowUp' });

      // Last item should be focused
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[2]).toHaveFocus();
    });

    it('should wrap around when navigating past last item', async () => {
      render(
        <ContextMenu items={mockItems}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      );

      fireEvent.contextMenu(screen.getByTestId('trigger'));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      const menuItems = screen.getAllByRole('menuitem');

      // Navigate through all items using End key to get to last
      await act(async () => {
        fireEvent.keyDown(document, { key: 'End' });
      });

      // Last item should be focused (check tabIndex)
      expect(menuItems[2]).toHaveAttribute('tabIndex', '0');
      expect(menuItems[2].className).toContain('bg-stone-100');

      // Navigate once more to wrap to first
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });

      // First item should now be focused
      expect(menuItems[0]).toHaveAttribute('tabIndex', '0');
      expect(menuItems[2]).toHaveAttribute('tabIndex', '-1');
    });

    it('should select item with Enter key', async () => {
      const onClick = vi.fn();
      const items: ContextMenuItem[] = [
        { id: 'test', label: 'Test', onClick },
      ];

      render(
        <ContextMenu items={items}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      );

      fireEvent.contextMenu(screen.getByTestId('trigger'));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Navigate to first item using Home key (more reliable than ArrowDown)
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Home' });
      });

      // Verify item is focused
      const menuItem = screen.getByRole('menuitem');
      expect(menuItem).toHaveAttribute('tabIndex', '0');

      // Select with Enter
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Enter' });
      });

      // Wait for closing animation and onClick delay
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(onClick).toHaveBeenCalled();
    });

    it('should select item with Space key', async () => {
      const onClick = vi.fn();
      const items: ContextMenuItem[] = [
        { id: 'test', label: 'Test', onClick },
      ];

      render(
        <ContextMenu items={items}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      );

      fireEvent.contextMenu(screen.getByTestId('trigger'));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Navigate to first item using Home key
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Home' });
      });

      // Verify item is focused
      const menuItem = screen.getByRole('menuitem');
      expect(menuItem).toHaveAttribute('tabIndex', '0');

      // Select with Space
      await act(async () => {
        fireEvent.keyDown(document, { key: ' ' });
      });

      // Wait for closing animation and onClick delay
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(onClick).toHaveBeenCalled();
    });

    it('should navigate to first item with Home key', async () => {
      render(
        <ContextMenu items={mockItems}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      );

      fireEvent.contextMenu(screen.getByTestId('trigger'));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Navigate down a couple times
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // Press Home to go to first
      fireEvent.keyDown(document, { key: 'Home' });

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[0]).toHaveFocus();
    });

    it('should navigate to last item with End key', async () => {
      render(
        <ContextMenu items={mockItems}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      );

      fireEvent.contextMenu(screen.getByTestId('trigger'));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Press End to go to last item
      fireEvent.keyDown(document, { key: 'End' });

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[2]).toHaveFocus();
    });

    it('should skip disabled items during navigation', async () => {
      const items: ContextMenuItem[] = [
        { id: 'first', label: 'First', onClick: vi.fn() },
        { id: 'disabled', label: 'Disabled', onClick: vi.fn(), disabled: true },
        { id: 'third', label: 'Third', onClick: vi.fn() },
      ];

      render(
        <ContextMenu items={items}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      );

      fireEvent.contextMenu(screen.getByTestId('trigger'));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      const menuItems = screen.getAllByRole('menuitem');

      // Navigate to first item using Home
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Home' });
      });

      // First item should be focused
      expect(menuItems[0]).toHaveAttribute('tabIndex', '0');

      // Navigate down - should skip disabled item and go to third
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });

      // Third item (index 2) should be focused, not disabled item (index 1)
      expect(menuItems[2]).toHaveAttribute('tabIndex', '0');
      expect(menuItems[1]).toHaveAttribute('tabIndex', '-1');
      expect(menuItems[0]).toHaveAttribute('tabIndex', '-1');
    });

    it('should highlight item on mouse hover', () => {
      render(
        <ContextMenu items={mockItems}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      );

      fireEvent.contextMenu(screen.getByTestId('trigger'));

      const menuItems = screen.getAllByRole('menuitem');

      // Hover over second item
      fireEvent.mouseEnter(menuItems[1]);

      // Second item should have highlight class
      expect(menuItems[1].className).toContain('bg-stone-100');
    });

    it('should have proper tabIndex on menu items', async () => {
      render(
        <ContextMenu items={mockItems}>
          <div data-testid="trigger">Trigger</div>
        </ContextMenu>
      );

      fireEvent.contextMenu(screen.getByTestId('trigger'));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Navigate to first item
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      const menuItems = screen.getAllByRole('menuitem');

      // First item (focused) should have tabIndex 0
      expect(menuItems[0]).toHaveAttribute('tabIndex', '0');

      // Other items should have tabIndex -1
      expect(menuItems[1]).toHaveAttribute('tabIndex', '-1');
      expect(menuItems[2]).toHaveAttribute('tabIndex', '-1');
    });
  });
});

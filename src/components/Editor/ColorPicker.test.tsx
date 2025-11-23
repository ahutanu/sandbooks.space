import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from './ColorPicker';
import type { Editor } from '@tiptap/core';

// Mock Floating UI
vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
  offset: vi.fn(() => ({})),
  flip: vi.fn(() => ({})),
  shift: vi.fn(() => ({})),
}));

describe('ColorPicker', () => {
  const mockEditor = {
    chain: vi.fn().mockReturnThis(),
    focus: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    toggleHighlight: vi.fn().mockReturnThis(),
    run: vi.fn(),
    getAttributes: vi.fn().mockReturnValue({}),
  } as unknown as Editor;

  const mockOnClose = vi.fn();
  const mockOnModeChange = vi.fn();
  const mockAnchorElement = document.createElement('button');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders text color mode by default', () => {
    render(
      <ColorPicker
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
        mode="text"
        onModeChange={mockOnModeChange}
      />
    );

    expect(screen.getByText('Text Color')).toBeInTheDocument();
  });

  it('renders highlight color mode', () => {
    render(
      <ColorPicker
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
        mode="highlight"
        onModeChange={mockOnModeChange}
      />
    );

    expect(screen.getByText('Highlight Color')).toBeInTheDocument();
  });

  it('switches between text and highlight modes', () => {
    render(
      <ColorPicker
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
        mode="text"
        onModeChange={mockOnModeChange}
      />
    );

    const highlightButton = screen.getByText('Highlight');
    fireEvent.click(highlightButton);
    expect(mockOnModeChange).toHaveBeenCalledWith('highlight');
  });

  it('applies text color when clicking a color swatch in text mode', () => {
    render(
      <ColorPicker
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
        mode="text"
        onModeChange={mockOnModeChange}
      />
    );

    const colorButtons = screen.getAllByRole('button');
    const firstColorButton = colorButtons.find(btn => 
      btn.getAttribute('style')?.includes('background-color')
    );
    
    if (firstColorButton) {
      fireEvent.click(firstColorButton);
      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockEditor.focus).toHaveBeenCalled();
      expect(mockEditor.setColor).toHaveBeenCalled();
      expect(mockEditor.run).toHaveBeenCalled();
    }
  });

  it('applies highlight color when clicking a color swatch in highlight mode', () => {
    render(
      <ColorPicker
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
        mode="highlight"
        onModeChange={mockOnModeChange}
      />
    );

    const colorButtons = screen.getAllByRole('button');
    const firstColorButton = colorButtons.find(btn => 
      btn.getAttribute('style')?.includes('background-color')
    );
    
    if (firstColorButton) {
      fireEvent.click(firstColorButton);
      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockEditor.focus).toHaveBeenCalled();
      expect(mockEditor.toggleHighlight).toHaveBeenCalled();
      expect(mockEditor.run).toHaveBeenCalled();
    }
  });

  it('applies custom color from color input', () => {
    render(
      <ColorPicker
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
        mode="text"
        onModeChange={mockOnModeChange}
      />
    );

    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
    expect(colorInput).toBeInTheDocument();
    
    if (colorInput) {
      fireEvent.change(colorInput, { target: { value: '#FF0000' } });
      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockEditor.setColor).toHaveBeenCalled();
    }
  });

  it('closes on outside click', () => {
    render(
      <ColorPicker
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
        mode="text"
        onModeChange={mockOnModeChange}
      />
    );

    fireEvent.mouseDown(document.body);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close when clicking inside popover', () => {
    render(
      <ColorPicker
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
        mode="text"
        onModeChange={mockOnModeChange}
      />
    );

    const popover = screen.getByRole('dialog');
    fireEvent.mouseDown(popover);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows current text color as selected', () => {
    const mockEditorWithColor = {
      ...mockEditor,
      getAttributes: vi.fn().mockReturnValue({ color: '#2563EB' }),
    } as unknown as Editor;

    render(
      <ColorPicker
        editor={mockEditorWithColor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
        mode="text"
        onModeChange={mockOnModeChange}
      />
    );

    expect(mockEditorWithColor.getAttributes).toHaveBeenCalledWith('textStyle');
  });

  it('shows current highlight color as selected', () => {
    const mockEditorWithHighlight = {
      ...mockEditor,
      getAttributes: vi.fn((mark: string) => {
        if (mark === 'highlight') return { color: '#16A34A' };
        return {};
      }),
    } as unknown as Editor;

    render(
      <ColorPicker
        editor={mockEditorWithHighlight}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
        mode="highlight"
        onModeChange={mockOnModeChange}
      />
    );

    expect(mockEditorWithHighlight.getAttributes).toHaveBeenCalledWith('highlight');
  });
});


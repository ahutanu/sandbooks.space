import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FontControls } from './FontControls';
import type { Editor } from '@tiptap/core';

// Mock Floating UI
vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
  offset: vi.fn(() => ({})),
  flip: vi.fn(() => ({})),
  shift: vi.fn(() => ({})),
}));

describe('FontControls', () => {
  const mockEditor = {
    chain: vi.fn().mockReturnThis(),
    focus: vi.fn().mockReturnThis(),
    setFontFamily: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    run: vi.fn(),
    getAttributes: vi.fn().mockReturnValue({}),
  } as unknown as Editor;

  const mockOnClose = vi.fn();
  const mockAnchorElement = document.createElement('button');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders font controls', () => {
    render(
      <FontControls
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
      />
    );

    expect(screen.getByText('Font')).toBeInTheDocument();
    expect(screen.getByLabelText(/family/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/size/i)).toBeInTheDocument();
  });

  it('opens font family dropdown on click', () => {
    render(
      <FontControls
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
      />
    );

    const familyButton = screen.getByLabelText('Font family');
    fireEvent.click(familyButton);

    const options = screen.getAllByRole('option');
    const optionTexts = options.map(opt => opt.textContent);
    expect(optionTexts).toContain('JetBrains Mono');
    expect(optionTexts).toContain('Inter');
    expect(optionTexts).toContain('System');
  });

  it('opens font size dropdown on click', () => {
    render(
      <FontControls
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
      />
    );

    const sizeButton = screen.getByLabelText('Font size');
    fireEvent.click(sizeButton);

    const options = screen.getAllByRole('option');
    const optionTexts = options.map(opt => opt.textContent);
    expect(optionTexts).toContain('12px');
    expect(optionTexts).toContain('14px');
    expect(optionTexts).toContain('16px');
  });

  it('applies font family when selected', () => {
    render(
      <FontControls
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
      />
    );

    const familyButton = screen.getByLabelText('Font family');
    fireEvent.click(familyButton);

    const options = screen.getAllByRole('option');
    const jetbrainsOption = options.find(opt => opt.textContent === 'JetBrains Mono');
    if (jetbrainsOption) {
      fireEvent.click(jetbrainsOption);
    }

    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockEditor.focus).toHaveBeenCalled();
    expect(mockEditor.setFontFamily).toHaveBeenCalledWith('JetBrains Mono Variable, monospace');
    expect(mockEditor.run).toHaveBeenCalled();
  });

  it('applies font size when selected', () => {
    render(
      <FontControls
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
      />
    );

    const sizeButton = screen.getByLabelText('Font size');
    fireEvent.click(sizeButton);

    const sizeOptions = screen.getAllByRole('option');
    const size14Option = sizeOptions.find(option => option.textContent === '14px');
    if (size14Option) {
      fireEvent.click(size14Option);
    }

    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockEditor.focus).toHaveBeenCalled();
    expect(mockEditor.setFontSize).toHaveBeenCalledWith('14');
    expect(mockEditor.run).toHaveBeenCalled();
  });

  it('shows current font family', () => {
    const mockEditorWithFont = {
      ...mockEditor,
      getAttributes: vi.fn().mockReturnValue({
        fontFamily: 'Inter Variable, sans-serif',
      }),
    } as unknown as Editor;

    render(
      <FontControls
        editor={mockEditorWithFont}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
      />
    );

    expect(mockEditorWithFont.getAttributes).toHaveBeenCalledWith('textStyle');
  });

  it('shows current font size', () => {
    const mockEditorWithSize = {
      ...mockEditor,
      getAttributes: vi.fn().mockReturnValue({
        fontSize: '16',
      }),
    } as unknown as Editor;

    render(
      <FontControls
        editor={mockEditorWithSize}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
      />
    );

    const sizeButton = screen.getByLabelText('Font size');
    expect(sizeButton).toHaveTextContent('16px');
  });

  it('closes on outside click', () => {
    render(
      <FontControls
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
      />
    );

    fireEvent.mouseDown(document.body);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes dropdown when selecting a font family', () => {
    render(
      <FontControls
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
      />
    );

    const familyButton = screen.getByLabelText('Font family');
    fireEvent.click(familyButton);

    const options = screen.getAllByRole('option');
    const jetbrainsOption = options.find(opt => opt.textContent === 'JetBrains Mono');
    if (jetbrainsOption) {
      fireEvent.click(jetbrainsOption);
    }

    // Dropdown should close - check that options are no longer visible
    const remainingOptions = screen.queryAllByRole('option');
    expect(remainingOptions.length).toBe(0);
  });

  it('closes dropdown when selecting a font size', () => {
    render(
      <FontControls
        editor={mockEditor}
        onClose={mockOnClose}
        anchorElement={mockAnchorElement}
      />
    );

    const sizeButton = screen.getByLabelText('Font size');
    fireEvent.click(sizeButton);

    const sizeOptions = screen.getAllByRole('option');
    const size14Option = sizeOptions.find(option => option.textContent === '14px');
    if (size14Option) {
      fireEvent.click(size14Option);
    }

    // Dropdown should close
    expect(screen.queryByText('12px')).not.toBeInTheDocument();
  });
});


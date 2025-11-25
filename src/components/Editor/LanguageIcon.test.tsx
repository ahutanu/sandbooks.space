import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LanguageIcon } from './LanguageIcon';

describe('LanguageIcon', () => {
  it('renders Python icon for python language', () => {
    const { container } = render(<LanguageIcon language="python" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders Python icon for py language', () => {
    const { container } = render(<LanguageIcon language="py" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders JavaScript icon for javascript language', () => {
    const { container } = render(<LanguageIcon language="javascript" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders JavaScript icon for js language', () => {
    const { container } = render(<LanguageIcon language="js" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders TypeScript icon for typescript language', () => {
    const { container } = render(<LanguageIcon language="typescript" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders TypeScript icon for ts language', () => {
    const { container } = render(<LanguageIcon language="ts" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders Bash icon for bash language', () => {
    const { container } = render(<LanguageIcon language="bash" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders Bash icon for sh language', () => {
    const { container } = render(<LanguageIcon language="sh" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders Bash icon for shell language', () => {
    const { container } = render(<LanguageIcon language="shell" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders Go icon for go language', () => {
    const { container } = render(<LanguageIcon language="go" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders Go icon for golang language', () => {
    const { container } = render(<LanguageIcon language="golang" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders terminal icon for unknown language', () => {
    const { container } = render(<LanguageIcon language="unknown" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders terminal icon for empty string', () => {
    const { container } = render(<LanguageIcon language="" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('handles case-insensitive language names', () => {
    const { container: container1 } = render(<LanguageIcon language="PYTHON" />);
    const { container: container2 } = render(<LanguageIcon language="Python" />);
    expect(container1.querySelector('svg')).toBeInTheDocument();
    expect(container2.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom size', () => {
    const { container } = render(<LanguageIcon language="python" size={20} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LanguageIcon language="python" className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('sets aria-hidden attribute', () => {
    const { container } = render(<LanguageIcon language="python" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});



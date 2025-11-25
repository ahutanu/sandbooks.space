import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotebookOutput } from '../NotebookOutput';
import type { JupyterOutput } from '../../../types/notebook';

describe('NotebookOutput', () => {
  it('renders nothing for empty outputs', () => {
    const { container } = render(<NotebookOutput outputs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders stream stdout output', () => {
    const outputs: JupyterOutput[] = [
      {
        output_type: 'stream',
        name: 'stdout',
        text: 'Hello World'
      }
    ];

    render(<NotebookOutput outputs={outputs} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders stream stderr output with error styling', () => {
    const outputs: JupyterOutput[] = [
      {
        output_type: 'stream',
        name: 'stderr',
        text: 'Error message'
      }
    ];

    const { container } = render(<NotebookOutput outputs={outputs} />);
    const pre = container.querySelector('pre');
    expect(pre).toHaveClass('text-red-600');
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders error output', () => {
    const outputs: JupyterOutput[] = [
      {
        output_type: 'error',
        ename: 'ValueError',
        evalue: 'invalid value',
        traceback: ['Traceback:', '  File "test.py", line 1', 'ValueError: invalid value']
      }
    ];

    render(<NotebookOutput outputs={outputs} />);
    // Error name and value appear in multiple places (header and traceback)
    const errorElements = screen.getAllByText(/ValueError/);
    expect(errorElements.length).toBeGreaterThan(0);
  });

  it('renders HTML output', () => {
    const outputs: JupyterOutput[] = [
      {
        output_type: 'display_data',
        data: {
          'text/html': '<table><tr><td>Cell 1</td></tr></table>'
        }
      }
    ];

    const { container } = render(<NotebookOutput outputs={outputs} />);
    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
  });

  it('sanitizes malicious HTML', () => {
    const outputs: JupyterOutput[] = [
      {
        output_type: 'display_data',
        data: {
          'text/html': '<div>Safe content</div><script>alert("xss")</script>'
        }
      }
    ];

    const { container } = render(<NotebookOutput outputs={outputs} />);
    expect(screen.getByText('Safe content')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull(); // Script should be removed
  });

  it('renders PNG image output', () => {
    const outputs: JupyterOutput[] = [
      {
        output_type: 'display_data',
        data: {
          'image/png': 'base64encodeddata'
        },
        execution_count: 1
      }
    ];

    const { container } = render(<NotebookOutput outputs={outputs} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.src).toContain('data:image/png;base64,base64encodeddata');
    expect(screen.getByText('Out[1]:')).toBeInTheDocument();
  });

  it('renders JSON output', () => {
    const outputs: JupyterOutput[] = [
      {
        output_type: 'execute_result',
        data: {
          'application/json': { key: 'value', nested: { data: 123 } }
        },
        execution_count: 2
      }
    ];

    render(<NotebookOutput outputs={outputs} />);
    expect(screen.getByText(/key/)).toBeInTheDocument();
    expect(screen.getByText(/value/)).toBeInTheDocument();
    expect(screen.getByText('Out[2]:')).toBeInTheDocument();
  });

  it('renders plain text as fallback', () => {
    const outputs: JupyterOutput[] = [
      {
        output_type: 'execute_result',
        data: {
          'text/plain': 'Simple text output'
        }
      }
    ];

    render(<NotebookOutput outputs={outputs} />);
    expect(screen.getByText('Simple text output')).toBeInTheDocument();
  });

  it('renders multiple outputs in sequence', () => {
    const outputs: JupyterOutput[] = [
      {
        output_type: 'stream',
        name: 'stdout',
        text: 'First output'
      },
      {
        output_type: 'display_data',
        data: {
          'image/png': 'imagedata'
        }
      },
      {
        output_type: 'stream',
        name: 'stdout',
        text: 'Second output'
      }
    ];

    const { container } = render(<NotebookOutput outputs={outputs} />);
    expect(screen.getByText('First output')).toBeInTheDocument();
    expect(screen.getByText('Second output')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('prioritizes HTML over plain text', () => {
    const outputs: JupyterOutput[] = [
      {
        output_type: 'display_data',
        data: {
          'text/html': '<strong>HTML Output</strong>',
          'text/plain': 'Plain text'
        }
      }
    ];

    const { container } = render(<NotebookOutput outputs={outputs} />);
    expect(container.querySelector('strong')).toBeInTheDocument();
    expect(screen.getByText('HTML Output')).toBeInTheDocument();
    // Plain text should not be rendered when HTML is available
    expect(screen.queryByText('Plain text')).not.toBeInTheDocument();
  });
});

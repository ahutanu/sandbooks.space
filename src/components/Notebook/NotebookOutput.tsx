import React from 'react';
import DOMPurify from 'dompurify';
import katex from 'katex';
import type { JupyterOutput } from '../../types/notebook';
import 'katex/dist/katex.min.css';

interface NotebookOutputProps {
  outputs: JupyterOutput[];
}

/**
 * Renders Jupyter notebook outputs following the nbformat specification
 * Supports: text, HTML, images, LaTeX, errors
 */
export const NotebookOutput: React.FC<NotebookOutputProps> = ({ outputs }) => {
  if (!outputs || outputs.length === 0) {
    return null;
  }

  return (
    <div className="notebook-outputs space-y-2">
      {outputs.map((output, idx) => (
        <OutputRenderer key={idx} output={output} />
      ))}
    </div>
  );
};

/**
 * Renders a single Jupyter output based on its type
 */
const OutputRenderer: React.FC<{ output: JupyterOutput }> = ({ output }) => {
  // Stream output (stdout/stderr)
  if (output.output_type === 'stream') {
    return (
      <pre
        className={`stream-output ${
          output.name === 'stderr' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
        } font-mono text-sm p-3 bg-gray-50 dark:bg-stone-800 rounded overflow-x-auto whitespace-pre-wrap break-words`}
      >
        {output.text}
      </pre>
    );
  }

  // Error output
  if (output.output_type === 'error') {
    return (
      <div className="error-output p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <div className="font-semibold text-red-700 dark:text-red-400">
          {output.ename}: {output.evalue}
        </div>
        {output.traceback && output.traceback.length > 0 && (
          <pre className="mt-2 text-xs font-mono text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap break-words">
            {output.traceback.join('\n')}
          </pre>
        )}
      </div>
    );
  }

  // Rich outputs (display_data, execute_result)
  if (output.data) {
    return <RichOutputRenderer data={output.data} executionCount={output.execution_count} />;
  }

  return null;
};

/**
 * Renders rich output data based on MIME type priority
 */
const RichOutputRenderer: React.FC<{
  data: JupyterOutput['data'];
  executionCount?: number;
}> = ({ data, executionCount }) => {
  if (!data) return null;

  // Priority 1: HTML (pandas DataFrames, rich tables)
  if (data['text/html']) {
    const sanitized = DOMPurify.sanitize(data['text/html'] as string, {
      ADD_TAGS: ['style'],
      ADD_ATTR: ['style', 'class']
    });
    return (
      <div className="rich-output-html">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <div
          className="html-output p-3 bg-white dark:bg-stone-800 rounded border border-gray-200 dark:border-stone-700 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>
    );
  }

  // Priority 2: Images (matplotlib, PIL)
  if (data['image/png']) {
    return (
      <div className="rich-output-image">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <img
          src={`data:image/png;base64,${data['image/png']}`}
          alt="Output"
          className="max-w-full h-auto rounded border border-gray-200 dark:border-stone-700"
        />
      </div>
    );
  }

  if (data['image/jpeg']) {
    return (
      <div className="rich-output-image">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <img
          src={`data:image/jpeg;base64,${data['image/jpeg']}`}
          alt="Output"
          className="max-w-full h-auto rounded border border-gray-200 dark:border-stone-700"
        />
      </div>
    );
  }

  if (data['image/svg+xml']) {
    const svgData = typeof data['image/svg+xml'] === 'string'
      ? data['image/svg+xml']
      : String(data['image/svg+xml']);
    const sanitized = DOMPurify.sanitize(svgData);
    return (
      <div className="rich-output-svg">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <div
          className="svg-output max-w-full overflow-auto"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>
    );
  }

  // Priority 3: LaTeX (mathematical equations)
  if (data['text/latex']) {
    const latex = data['text/latex'] as string;
    let html: string;
    let renderError = false;

    try {
      html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true
      });
    } catch (error) {
      console.error('Failed to render LaTeX:', error);
      renderError = true;
      html = '';
    }

    if (renderError) {
      // Fallback to plain text
      return (
        <pre className="text-sm font-mono p-3 bg-gray-50 dark:bg-stone-800 rounded overflow-x-auto">
          {latex}
        </pre>
      );
    }

    return (
      <div className="rich-output-latex">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <div
          className="latex-output p-3 bg-white dark:bg-stone-800 rounded border border-gray-200 dark:border-stone-700 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  // Priority 4: JSON (for debugging or structured data)
  if (data['application/json']) {
    return (
      <div className="rich-output-json">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <pre className="text-sm font-mono p-3 bg-gray-50 dark:bg-stone-800 rounded overflow-x-auto whitespace-pre-wrap break-words">
          {JSON.stringify(data['application/json'], null, 2)}
        </pre>
      </div>
    );
  }

  // Fallback: Plain text
  if (data['text/plain']) {
    return (
      <div className="rich-output-plain">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <pre className="text-sm font-mono p-3 bg-gray-50 dark:bg-stone-800 rounded overflow-x-auto whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
          {data['text/plain'] as string}
        </pre>
      </div>
    );
  }

  return null;
};

import React from 'react';
import { m } from 'framer-motion';
import DOMPurify from 'dompurify';
import katex from 'katex';
import type { JupyterOutput } from '../../types/notebook';
import {
  outputContainerVariants,
  outputBlockVariants,
  richOutputVariants,
  errorOutputVariants,
} from '../../utils/animationVariants';
import 'katex/dist/katex.min.css';

interface NotebookOutputProps {
  outputs: JupyterOutput[];
}

/**
 * Renders Jupyter notebook outputs following the nbformat specification
 * Supports: text, HTML, images, LaTeX, errors
 * Uses stagger animations for progressive reveal
 */
export const NotebookOutput: React.FC<NotebookOutputProps> = ({ outputs }) => {
  if (!outputs || outputs.length === 0) {
    return null;
  }

  return (
    <m.div
      className="notebook-outputs space-y-2"
      variants={outputContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {outputs.map((output, idx) => (
        <OutputRenderer key={idx} output={output} />
      ))}
    </m.div>
  );
};

/**
 * Renders a single Jupyter output based on its type
 * Uses appropriate animation variants for different output types
 */
const OutputRenderer: React.FC<{ output: JupyterOutput }> = ({ output }) => {
  // Stream output (stdout/stderr)
  if (output.output_type === 'stream') {
    const isError = output.name === 'stderr';
    return (
      <m.pre
        variants={isError ? errorOutputVariants : outputBlockVariants}
        className={`stream-output ${
          isError ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
        } font-mono text-sm p-3 bg-gray-50 dark:bg-stone-800 rounded overflow-x-auto whitespace-pre-wrap break-words`}
      >
        {output.text}
      </m.pre>
    );
  }

  // Error output - uses attention-grabbing shake animation
  if (output.output_type === 'error') {
    return (
      <m.div
        variants={errorOutputVariants}
        className="error-output p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded"
      >
        <div className="font-semibold text-red-700 dark:text-red-400">
          {output.ename}: {output.evalue}
        </div>
        {output.traceback && output.traceback.length > 0 && (
          <pre className="mt-2 text-xs font-mono text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap break-words">
            {output.traceback.join('\n')}
          </pre>
        )}
      </m.div>
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
 * Uses spring-scale animation with blur-to-sharp reveal
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
      <m.div variants={richOutputVariants} className="rich-output-html">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <div
          className="html-output p-3 bg-white dark:bg-stone-800 rounded border border-gray-200 dark:border-stone-700 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </m.div>
    );
  }

  // Priority 2: Images (matplotlib, PIL) - uses rich output with saturation reveal
  if (data['image/png']) {
    return (
      <m.div variants={richOutputVariants} className="rich-output-image">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <img
          src={`data:image/png;base64,${data['image/png']}`}
          alt="Output"
          className="max-w-full h-auto rounded border border-gray-200 dark:border-stone-700"
        />
      </m.div>
    );
  }

  if (data['image/jpeg']) {
    return (
      <m.div variants={richOutputVariants} className="rich-output-image">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <img
          src={`data:image/jpeg;base64,${data['image/jpeg']}`}
          alt="Output"
          className="max-w-full h-auto rounded border border-gray-200 dark:border-stone-700"
        />
      </m.div>
    );
  }

  if (data['image/svg+xml']) {
    const svgData = typeof data['image/svg+xml'] === 'string'
      ? data['image/svg+xml']
      : String(data['image/svg+xml']);
    const sanitized = DOMPurify.sanitize(svgData);
    return (
      <m.div variants={richOutputVariants} className="rich-output-svg">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <div
          className="svg-output max-w-full overflow-auto"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </m.div>
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
        <m.pre variants={outputBlockVariants} className="text-sm font-mono p-3 bg-gray-50 dark:bg-stone-800 rounded overflow-x-auto">
          {latex}
        </m.pre>
      );
    }

    return (
      <m.div variants={richOutputVariants} className="rich-output-latex">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <div
          className="latex-output p-3 bg-white dark:bg-stone-800 rounded border border-gray-200 dark:border-stone-700 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </m.div>
    );
  }

  // Priority 4: JSON (for debugging or structured data)
  if (data['application/json']) {
    return (
      <m.div variants={outputBlockVariants} className="rich-output-json">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <pre className="text-sm font-mono p-3 bg-gray-50 dark:bg-stone-800 rounded overflow-x-auto whitespace-pre-wrap break-words">
          {JSON.stringify(data['application/json'], null, 2)}
        </pre>
      </m.div>
    );
  }

  // Fallback: Plain text
  if (data['text/plain']) {
    return (
      <m.div variants={outputBlockVariants} className="rich-output-plain">
        {executionCount !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Out[{executionCount}]:</div>
        )}
        <pre className="text-sm font-mono p-3 bg-gray-50 dark:bg-stone-800 rounded overflow-x-auto whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
          {data['text/plain'] as string}
        </pre>
      </m.div>
    );
  }

  return null;
};

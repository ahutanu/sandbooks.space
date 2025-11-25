import type { HopxSandbox } from '../types/hopx.types';
import type { JupyterOutput, ExecuteCellResponse, KernelStatus } from '../types/notebook.types';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

// Session timeout: 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Represents a single kernel session for a notebook
 * Each session maintains a persistent Hopx sandbox with execution context
 */
export class KernelSession {
  public readonly noteId: string;
  public readonly sandboxId: string;
  public readonly sandbox: HopxSandbox;
  public executionCount: number = 0;
  public status: KernelStatus = 'idle';
  public readonly createdAt: Date;
  public lastActivity: Date;

  constructor(noteId: string, sandbox: HopxSandbox, sandboxId: string) {
    this.noteId = noteId;
    this.sandbox = sandbox;
    this.sandboxId = sandboxId;
    this.createdAt = new Date();
    this.lastActivity = new Date();

    logger.info('Kernel session created', {
      noteId,
      sandboxId,
      createdAt: this.createdAt.toISOString()
    });
  }

  /**
   * Check if session has timed out due to inactivity
   */
  public isTimedOut(): boolean {
    const now = Date.now();
    const inactiveMs = now - this.lastActivity.getTime();
    return inactiveMs > SESSION_TIMEOUT_MS;
  }

  /**
   * Get session age in milliseconds
   */
  public getAgeMs(): number {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    this.lastActivity = new Date();
  }

  /**
   * Execute code cell using IPython's native InteractiveShell
   *
   * This provides full support for:
   * - Shell commands (!pip install, !ls, etc.)
   * - Line magics (%timeit, %pip, %cd, %who, etc.)
   * - Cell magics (%%bash, %%time, %%writefile, etc.)
   * - Rich output capture (matplotlib, pandas, etc.)
   * - Variable persistence across cells
   */
  public async executeCell(code: string): Promise<ExecuteCellResponse> {
    const startTime = Date.now();

    logger.info('Executing cell', {
      noteId: this.noteId,
      sandboxId: this.sandboxId,
      executionCount: this.executionCount + 1,
      codeLength: code.length
    });

    this.status = 'busy';
    this.updateActivity();

    try {
      // Use IPython's InteractiveShell for native magic support
      // This wrapper:
      // 1. Creates/reuses a persistent IPython shell instance
      // 2. Captures stdout/stderr via custom streams
      // 3. Captures rich outputs (matplotlib, pandas, etc.)
      // 4. Handles shell commands (!), line magics (%), and cell magics (%%)
      // 5. Returns results in Jupyter notebook format
      const wrappedCode = `
import sys
import io
import base64
import json

# Capture stdout/stderr
_stdout_capture = io.StringIO()
_stderr_capture = io.StringIO()
_original_stdout = sys.stdout
_original_stderr = sys.stderr
sys.stdout = _stdout_capture
sys.stderr = _stderr_capture

_outputs = []
_user_code_error = None

try:
    # Initialize or get existing IPython shell
    from IPython.core.interactiveshell import InteractiveShell

    # Create shell instance if not exists (persists across calls in same sandbox)
    if not hasattr(InteractiveShell, '_sandbooks_instance') or InteractiveShell._sandbooks_instance is None:
        InteractiveShell._sandbooks_instance = InteractiveShell.instance()
        # Configure for non-interactive use
        InteractiveShell._sandbooks_instance.colors = 'NoColor'

    _shell = InteractiveShell._sandbooks_instance

    # Set matplotlib backend for non-GUI rendering
    try:
        import matplotlib
        matplotlib.use('Agg')
    except ImportError:
        pass

    # Execute the user code via IPython
    _user_code = ${JSON.stringify(code)}
    _result = _shell.run_cell(_user_code, store_history=True, silent=False)

    # Capture matplotlib figures if any
    try:
        import matplotlib.pyplot as plt
        if len(plt.get_fignums()) > 0:
            for fig_num in plt.get_fignums():
                fig = plt.figure(fig_num)
                buf = io.BytesIO()
                fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
                buf.seek(0)
                img_b64 = base64.b64encode(buf.read()).decode('utf-8')
                _outputs.append({
                    "output_type": "display_data",
                    "data": {"image/png": img_b64},
                    "metadata": {}
                })
                plt.close(fig)
    except ImportError:
        pass
    except Exception:
        pass

    # Handle execution result (last expression value)
    if _result.result is not None:
        _val = _result.result
        _result_data = {"text/plain": repr(_val)}

        # Check for HTML representation (pandas, etc.)
        if hasattr(_val, '_repr_html_'):
            try:
                html = _val._repr_html_()
                if html:
                    _result_data["text/html"] = html
            except Exception:
                pass

        # Check for PNG representation
        if hasattr(_val, '_repr_png_'):
            try:
                png_data = _val._repr_png_()
                if png_data:
                    _result_data["image/png"] = base64.b64encode(png_data).decode('utf-8')
            except Exception:
                pass

        # Check for SVG representation
        if hasattr(_val, '_repr_svg_'):
            try:
                svg_data = _val._repr_svg_()
                if svg_data:
                    _result_data["image/svg+xml"] = svg_data
            except Exception:
                pass

        _outputs.append({
            "output_type": "execute_result",
            "data": _result_data,
            "metadata": {},
            "execution_count": ${this.executionCount + 1}
        })

    # Check for errors in execution
    if not _result.success:
        if _result.error_before_exec:
            err = _result.error_before_exec
            _user_code_error = {
                "output_type": "error",
                "ename": type(err).__name__,
                "evalue": str(err),
                "traceback": [str(err)]
            }
        elif _result.error_in_exec:
            err = _result.error_in_exec
            import traceback as tb
            _user_code_error = {
                "output_type": "error",
                "ename": type(err).__name__,
                "evalue": str(err),
                "traceback": tb.format_exception(type(err), err, err.__traceback__)
            }

except Exception as e:
    import traceback
    _user_code_error = {
        "output_type": "error",
        "ename": type(e).__name__,
        "evalue": str(e),
        "traceback": traceback.format_exc().split('\\n')
    }

finally:
    # Restore stdout/stderr
    sys.stdout = _original_stdout
    sys.stderr = _original_stderr

# Get captured output
_stdout_text = _stdout_capture.getvalue()
_stderr_text = _stderr_capture.getvalue()

# Build outputs array
_final_outputs = []

# Add stdout if present
if _stdout_text:
    _final_outputs.append({
        "output_type": "stream",
        "name": "stdout",
        "text": _stdout_text
    })

# Add stderr if present
if _stderr_text:
    _final_outputs.append({
        "output_type": "stream",
        "name": "stderr",
        "text": _stderr_text
    })

# Add rich outputs (matplotlib, pandas, etc.)
_final_outputs.extend(_outputs)

# Add error if occurred
if _user_code_error:
    _final_outputs.append(_user_code_error)

# Return JSON
print(json.dumps({"outputs": _final_outputs}))
`;

      // Execute wrapped code
      const result = await this.sandbox.runCode(wrappedCode, { language: 'python' });

      // Parse outputs from JSON
      let outputs: JupyterOutput[] = [];
      try {
        const parsed = JSON.parse(result.stdout || '{}');
        outputs = parsed.outputs || [];
      } catch (parseError) {
        // If parsing fails, return execution output as plain text
        logger.warn('Failed to parse cell outputs', {
          noteId: this.noteId,
          error: getErrorMessage(parseError)
        });
        outputs = [
          {
            output_type: 'stream',
            name: 'stdout',
            text: result.stdout || ''
          }
        ];
        if (result.stderr) {
          outputs.push({
            output_type: 'stream',
            name: 'stderr',
            text: result.stderr
          });
        }
      }

      // Increment execution counter
      this.executionCount++;
      this.status = 'idle';
      this.updateActivity();

      const executionTime = Date.now() - startTime;

      logger.info('Cell execution completed', {
        noteId: this.noteId,
        sandboxId: this.sandboxId,
        executionCount: this.executionCount,
        executionTime,
        outputCount: outputs.length
      });

      return {
        outputs,
        execution_count: this.executionCount,
        executionTime
      };

    } catch (error: unknown) {
      this.status = 'idle';
      this.updateActivity();

      const errorMessage = getErrorMessage(error);
      logger.error('Cell execution failed', {
        noteId: this.noteId,
        sandboxId: this.sandboxId,
        error: errorMessage
      });

      // Return error as Jupyter error output
      const outputs: JupyterOutput[] = [
        {
          output_type: 'error',
          ename: 'ExecutionError',
          evalue: errorMessage,
          traceback: [errorMessage]
        }
      ];

      return {
        outputs,
        execution_count: this.executionCount,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Restart the kernel (clear execution count, but keep sandbox alive)
   */
  public restart(): void {
    logger.info('Restarting kernel session', {
      noteId: this.noteId,
      sandboxId: this.sandboxId,
      previousExecutionCount: this.executionCount
    });

    this.executionCount = 0;
    this.status = 'idle';
    this.updateActivity();
  }

  /**
   * Destroy the session and its sandbox
   */
  public async destroy(): Promise<void> {
    logger.info('Destroying kernel session', {
      noteId: this.noteId,
      sandboxId: this.sandboxId,
      executionCount: this.executionCount,
      ageMs: this.getAgeMs()
    });

    try {
      await this.sandbox.kill();
      this.status = 'dead';
      logger.info('Kernel session destroyed', {
        noteId: this.noteId,
        sandboxId: this.sandboxId
      });
    } catch (error: unknown) {
      logger.error('Failed to destroy kernel session', {
        noteId: this.noteId,
        sandboxId: this.sandboxId,
        error: getErrorMessage(error)
      });
      throw error;
    }
  }

  /**
   * Get session info for API responses
   */
  public getInfo() {
    return {
      noteId: this.noteId,
      sandboxId: this.sandboxId,
      executionCount: this.executionCount,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      lastActivity: this.lastActivity.toISOString(),
      ageMs: this.getAgeMs(),
      isTimedOut: this.isTimedOut()
    };
  }
}

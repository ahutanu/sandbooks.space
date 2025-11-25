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
   * Execute code cell with rich output capture
   * Wraps user code to capture matplotlib figures, pandas DataFrames, and other outputs
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
      // Wrap user code to capture rich outputs
      // This wrapper:
      // 1. Captures stdout/stderr
      // 2. Detects and saves matplotlib figures as base64 PNG
      // 3. Detects pandas DataFrames and gets HTML representation
      // 4. Handles errors gracefully
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
    # Execute user code
    exec(${JSON.stringify(code)})

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
                    "data": {
                        "image/png": img_b64
                    },
                    "metadata": {}
                })
                plt.close(fig)
    except ImportError:
        pass
    except Exception as e:
        # Matplotlib capture failed, but don't fail the whole execution
        pass

    # Check if last expression was a DataFrame or had rich repr
    try:
        if '_' in locals():
            last_val = locals()['_']
            if hasattr(last_val, '_repr_html_'):
                _outputs.append({
                    "output_type": "execute_result",
                    "data": {
                        "text/html": last_val._repr_html_(),
                        "text/plain": str(last_val)
                    },
                    "metadata": {},
                    "execution_count": ${this.executionCount + 1}
                })
            elif hasattr(last_val, '_repr_png_'):
                png_data = last_val._repr_png_()
                if png_data:
                    _outputs.append({
                        "output_type": "execute_result",
                        "data": {
                            "image/png": base64.b64encode(png_data).decode('utf-8')
                        },
                        "metadata": {},
                        "execution_count": ${this.executionCount + 1}
                    })
    except:
        pass

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

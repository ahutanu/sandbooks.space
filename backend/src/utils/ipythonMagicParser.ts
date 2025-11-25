import logger from './logger';

/**
 * Types of code segments parsed from user input
 */
export type SegmentType = 'python' | 'shell' | 'line_magic' | 'cell_magic';

export interface CodeSegment {
  type: SegmentType;
  content: string;
  originalLine?: string;
  lineNumber?: number;
}

export interface ParsedCode {
  segments: CodeSegment[];
  hasShellCommands: boolean;
  hasMagicCommands: boolean;
  hasPythonCode: boolean;
}

/**
 * Supported line magics that can be transformed to shell commands
 */
const SHELL_MAGICS: Record<string, (args: string) => string> = {
  pip: (args) => `pip ${args}`,
  conda: (args) => `conda ${args}`,
  cd: (args) => `cd ${args}`,
  ls: (args) => `ls ${args}`,
  pwd: () => 'pwd',
  cat: (args) => `cat ${args}`,
  mkdir: (args) => `mkdir ${args}`,
  rm: (args) => `rm ${args}`,
  cp: (args) => `cp ${args}`,
  mv: (args) => `mv ${args}`,
  man: (args) => `man ${args}`,
  env: (args) => args ? `export ${args}` : 'env',
  set_env: (args) => `export ${args}`,
  system: (args) => args,
  sx: (args) => args,
  sc: (args) => args,
};

/**
 * IPython-specific magics that require the IPython kernel
 * These cannot be converted to shell commands
 */
const _UNSUPPORTED_IPYTHON_MAGICS = [
  'time', 'timeit', 'prun', 'lprun', 'mprun', 'memit',
  'debug', 'pdb', 'who', 'whos', 'who_ls',
  'history', 'recall', 'rerun', 'macro',
  'edit', 'save', 'pastebin', 'notebook',
  'pylab', 'matplotlib', 'gui',
  'autocall', 'automagic', 'autoindent',
  'colors', 'xmode', 'quickref', 'doctest_mode',
  'precision', 'page', 'pprint', 'pfile', 'psource', 'pdef', 'pdoc',
  'bookmark', 'dhist', 'dirs', 'popd', 'pushd',
  'run', 'alias', 'unalias',
];

/**
 * Line magics that affect Python environment and need special handling
 */
const PYTHON_ENV_MAGICS = ['load_ext', 'reload_ext', 'unload_ext', 'reset', 'reset_selective'];

/**
 * Cell magics we can support via transformation
 */
const SUPPORTED_CELL_MAGICS = ['bash', 'sh', 'script', 'cmd', 'powershell'];

/**
 * Parse IPython-style code and split into executable segments
 *
 * Handles:
 * - Shell commands: !pip install package, !ls -la
 * - Line magics: %pip install package, %cd /path, %ls
 * - Cell magics: %%bash, %%sh (limited support)
 * - Pure Python code (everything else)
 *
 * @param code The raw code from the user
 * @returns Parsed code with segments ready for execution
 */
export function parseIPythonCode(code: string): ParsedCode {
  const lines = code.split('\n');
  const segments: CodeSegment[] = [];
  let currentPythonLines: string[] = [];
  let currentPythonStartLine = 0;
  let hasShellCommands = false;
  let hasMagicCommands = false;
  let hasPythonCode = false;

  const flushPythonCode = () => {
    if (currentPythonLines.length > 0) {
      const pythonCode = currentPythonLines.join('\n').trim();
      if (pythonCode) {
        segments.push({
          type: 'python',
          content: pythonCode,
          lineNumber: currentPythonStartLine
        });
        hasPythonCode = true;
      }
      currentPythonLines = [];
    }
  };

  // Check for cell magic at the start
  if (lines.length > 0 && lines[0].trim().startsWith('%%')) {
    const cellMagicMatch = lines[0].trim().match(/^%%(\w+)(?:\s+(.*))?$/);
    if (cellMagicMatch) {
      const [, magicName] = cellMagicMatch;
      const cellBody = lines.slice(1).join('\n');

      if (SUPPORTED_CELL_MAGICS.includes(magicName.toLowerCase())) {
        // Convert supported cell magics to shell commands
        segments.push({
          type: 'shell',
          content: cellBody,
          originalLine: lines[0]
        });
        hasShellCommands = true;
        hasMagicCommands = true;

        logger.debug('Parsed cell magic as shell', { magicName, bodyLength: cellBody.length });

        return { segments, hasShellCommands, hasMagicCommands, hasPythonCode };
      } else {
        // Unsupported cell magic - return as error indicator
        segments.push({
          type: 'cell_magic',
          content: `Unsupported cell magic: %%${magicName}. Supported: ${SUPPORTED_CELL_MAGICS.join(', ')}`,
          originalLine: lines[0]
        });
        hasMagicCommands = true;

        return { segments, hasShellCommands, hasMagicCommands, hasPythonCode };
      }
    }
  }

  // Process line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines in accumulation mode
    if (!trimmedLine) {
      currentPythonLines.push(line);
      continue;
    }

    // Check for shell command: !command
    if (trimmedLine.startsWith('!')) {
      flushPythonCode();

      const shellCommand = trimmedLine.slice(1).trim();
      segments.push({
        type: 'shell',
        content: shellCommand,
        originalLine: line,
        lineNumber: i + 1
      });
      hasShellCommands = true;
      currentPythonStartLine = i + 2;

      logger.debug('Parsed shell command', { command: shellCommand, line: i + 1 });
      continue;
    }

    // Check for line magic: %magic args
    if (trimmedLine.startsWith('%') && !trimmedLine.startsWith('%%')) {
      const magicMatch = trimmedLine.match(/^%(\w+)(?:\s+(.*))?$/);

      if (magicMatch) {
        const [, magicName, magicArgs = ''] = magicMatch;
        const lowerMagicName = magicName.toLowerCase();

        // Check for IPython-specific magics that can't be converted
        if (_UNSUPPORTED_IPYTHON_MAGICS.includes(lowerMagicName)) {
          flushPythonCode();

          segments.push({
            type: 'line_magic',
            content: `Unsupported IPython magic: %${magicName}. This requires an IPython kernel and is not available in this environment.`,
            originalLine: line,
            lineNumber: i + 1
          });
          hasMagicCommands = true;
          currentPythonStartLine = i + 2;
          continue;
        }

        // Check if it's a shell-transformable magic
        if (SHELL_MAGICS[lowerMagicName]) {
          flushPythonCode();

          const shellCommand = SHELL_MAGICS[lowerMagicName](magicArgs.trim());
          segments.push({
            type: 'shell',
            content: shellCommand,
            originalLine: line,
            lineNumber: i + 1
          });
          hasShellCommands = true;
          hasMagicCommands = true;
          currentPythonStartLine = i + 2;

          logger.debug('Converted line magic to shell', { magic: magicName, command: shellCommand });
          continue;
        }

        // Check for Python environment magics (can't support these)
        if (PYTHON_ENV_MAGICS.includes(lowerMagicName)) {
          flushPythonCode();

          segments.push({
            type: 'line_magic',
            content: `Unsupported magic: %${magicName}. This requires IPython kernel.`,
            originalLine: line,
            lineNumber: i + 1
          });
          hasMagicCommands = true;
          currentPythonStartLine = i + 2;
          continue;
        }

        // Unknown magic - provide helpful message
        flushPythonCode();

        segments.push({
          type: 'line_magic',
          content: `Unknown magic command: %${magicName}. Supported: ${Object.keys(SHELL_MAGICS).join(', ')}`,
          originalLine: line,
          lineNumber: i + 1
        });
        hasMagicCommands = true;
        currentPythonStartLine = i + 2;
        continue;
      }
    }

    // Regular Python code
    if (currentPythonLines.length === 0) {
      currentPythonStartLine = i + 1;
    }
    currentPythonLines.push(line);
  }

  // Flush any remaining Python code
  flushPythonCode();

  logger.debug('Code parsing complete', {
    totalSegments: segments.length,
    hasShellCommands,
    hasMagicCommands,
    hasPythonCode
  });

  return { segments, hasShellCommands, hasMagicCommands, hasPythonCode };
}

/**
 * Check if code contains any IPython magic commands
 * Quick check without full parsing
 */
export function containsMagicCommands(code: string): boolean {
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('!') || trimmed.startsWith('%')) {
      return true;
    }
  }
  return false;
}

/**
 * Check if code is pure Python (no magic commands)
 */
export function isPurePython(code: string): boolean {
  return !containsMagicCommands(code);
}

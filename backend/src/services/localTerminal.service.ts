import { randomUUID } from 'crypto';
import * as pty from 'node-pty';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import logger from '../utils/logger';

interface LocalTerminalSession {
  sessionId: string;
  ptyProcess: pty.IPty;
  shell: string;
  workingDir: string;
  env: Record<string, string>;
  createdAt: number;
  lastActivityAt: number;
  cols: number;
  rows: number;
}

class LocalTerminalService extends EventEmitter {
  private sessions: Map<string, LocalTerminalSession> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly maxSessions: number;

  constructor() {
    super();
    this.maxSessions = Number(process.env.MAX_LOCAL_TERMINAL_SESSIONS || 4);
    this.startCleanupJob();
  }
  
  /**
   * Get user's default shell with proper detection
   */
  private getDefaultShell(): string {
    // Use SHELL environment variable if available
    if (process.env.SHELL) {
      return process.env.SHELL;
    }
    
    // Platform-specific defaults
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    
    // Unix-like systems: try common shells
    const shells = ['/bin/zsh', '/bin/bash', '/bin/sh'];
    for (const shell of shells) {
      try {
        fs.accessSync(shell, fs.constants.F_OK);
        return shell;
      } catch {
        continue;
      }
    }
    
    return '/bin/sh'; // Fallback
  }
  
  /**
   * Get shell arguments for interactive login shell
   * Login shell mode ensures the shell loads the user's full profile
   * (e.g., .zprofile/.bash_profile then .zshrc/.bashrc)
   * This matches the behavior of native terminals like iTerm2 and Terminal.app
   */
  private getShellArgs(shell: string): string[] {
    const shellName = path.basename(shell);
    
    if (shellName === 'zsh') {
      // -l = login shell (loads .zprofile then .zshrc)
      // -i = interactive (required for proper prompt and command history)
      return ['-l', '-i'];
    } else if (shellName === 'bash') {
      // -l = login shell (loads .bash_profile then .bashrc)
      // -i = interactive (required for proper prompt and command history)
      return ['-l', '-i'];
    } else if (shellName === 'fish') {
      // Fish doesn't have login shell concept, but -l enables login mode
      // which loads config.fish
      return ['-l'];
    } else if (shellName === 'cmd.exe' || shellName === 'cmd') {
      return ['/K']; // Run autoexec commands
    } else if (shellName === 'powershell' || shellName === 'pwsh') {
      return ['-NoExit', '-Command', 'Set-Location $HOME']; // Start in home directory
    }
    
    return []; // Default: no args
  }
  
  /**
   * Build environment variables for shell session
   */
  private buildEnvironment(): Record<string, string> {
    const homeDir = os.homedir();
    const username = process.env.USER || process.env.USERNAME || 'user';
    const shell = this.getDefaultShell();

    // Whitelist-only environment to avoid leaking server secrets
    const allowedKeys = new Set([
      'LANG',
      'LC_ALL',
      'LC_CTYPE',
      'TZ',
      'PATH',
      'HOME',
      'USER',
      'LOGNAME',
      'SHELL',
      'TERM',
      'COLORTERM',
      'XTERM_VERSION',
    ]);

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value === undefined) continue;
      if (allowedKeys.has(key) || key.startsWith('LC_')) {
        env[key] = value;
      }
    }

    // Override critical variables for proper shell initialization
    env.HOME = homeDir;
    env.USER = username;
    env.LOGNAME = username;
    env.SHELL = shell;

    // Terminal configuration
    env.TERM = 'xterm-256color';
    env.COLORTERM = 'truecolor';
    env.TERM_PROGRAM = 'sandbooks';
    env.CLICOLOR = '1';
    env.LSCOLORS = 'Gxfxcxdxbxegedabagacad';

    // Ensure PATH includes common locations and is not empty
    const pathParts = (env.PATH || '').split(path.delimiter).filter(Boolean);
    const commonPaths = [
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/local/sbin',
      '/usr/sbin',
      '/sbin',
      `${homeDir}/.local/bin`,
      `${homeDir}/.cargo/bin`,
      `${homeDir}/.go/bin`,
    ];

    for (const commonPath of commonPaths) {
      if (!pathParts.includes(commonPath)) {
        pathParts.push(commonPath);
      }
    }
    env.PATH = pathParts.join(path.delimiter);

    return env;
  }
  
  /**
   * Validate terminal dimensions
   */
  private validateTerminalSize(cols: number, rows: number): void {
    if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
      throw new Error('Terminal dimensions must be integers');
    }
    if (cols <= 0 || rows <= 0) {
      throw new Error('Terminal dimensions must be positive');
    }
    if (cols > 1000 || rows > 1000) {
      throw new Error('Terminal dimensions exceed maximum allowed size (1000x1000)');
    }
    if (cols < 10 || rows < 2) {
      throw new Error('Terminal dimensions too small (minimum 10x2)');
    }
  }

  /**
   * Create a new local terminal session
   */
  async createSession(options?: {
    cols?: number;
    rows?: number;
    cwd?: string;
  }): Promise<{ sessionId: string; shell: string; workingDir: string }> {
    // Check if local terminal is enabled
    const isEnabled = process.env.ENABLE_LOCAL_TERMINAL === 'true';
    if (!isEnabled) {
      throw new Error('Local terminal is disabled. Set ENABLE_LOCAL_TERMINAL=true to enable.');
    }

    const sessionLimit = Number(process.env.MAX_LOCAL_TERMINAL_SESSIONS || this.maxSessions);
    if (this.sessions.size >= sessionLimit) {
      throw new Error(`Maximum local terminal sessions reached (${sessionLimit}). Close an existing session to continue.`);
    }

    const shell = this.getDefaultShell();
    const shellArgs = this.getShellArgs(shell);
    const env = this.buildEnvironment();
    const cwd = options?.cwd || env.HOME || process.cwd();
    const cols = options?.cols ?? 80;
    const rows = options?.rows ?? 24;

    // Validate terminal size
    this.validateTerminalSize(cols, rows);
    
    logger.info('Creating local terminal session', {
      shell,
      shellArgs,
      cwd,
      cols,
      rows
    });

    // Spawn PTY with interactive login shell
    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color', // Full ANSI color support
        cols,
        rows,
        cwd,
        env,
        // Use UTF-8 encoding
        encoding: 'utf8',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to spawn PTY process', {
        shell,
        shellArgs,
        cwd,
        error: errorMessage
      });
      throw new Error(`Failed to spawn shell "${shell}": ${errorMessage}. The shell may not be installed or accessible.`);
    }
    
    const sessionId = randomUUID();
    const now = Date.now();
    
    const session: LocalTerminalSession = {
      sessionId,
      ptyProcess,
      shell,
      workingDir: cwd,
      env,
      createdAt: now,
      lastActivityAt: now,
      cols,
      rows,
    };
    
    this.sessions.set(sessionId, session);
    
    // Handle PTY output - emit events for WebSocket streaming
    ptyProcess.onData((data: string) => {
      // Debug log first few chars (use debug level)
      logger.debug(`PTY Data: ${JSON.stringify(data.substring(0, 50))}`);
      session.lastActivityAt = Date.now();
      this.emit('data', sessionId, data);
    });
    
    // Handle process exit
    ptyProcess.onExit((exitInfo: { exitCode: number; signal?: number }) => {
      logger.info('PTY process exited', {
        sessionId,
        exitCode: exitInfo.exitCode,
        signal: exitInfo.signal
      });
      
      this.emit('exit', sessionId, exitInfo.exitCode, exitInfo.signal);
      
      // Cleanup session after short delay (allow reconnection)
      setTimeout(() => {
        if (this.sessions.has(sessionId)) {
          this.sessions.delete(sessionId);
        }
      }, 5000);
    });
    
    logger.info('Local terminal session created', {
      sessionId,
      shell,
      workingDir: cwd
    });
    
    return {
      sessionId,
      shell,
      workingDir: cwd
    };
  }
  
  /**
   * Write input to PTY (user keystrokes, commands, etc.)
   */
  writeToSession(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    session.lastActivityAt = Date.now();
    session.ptyProcess.write(data);
  }
  
  /**
   * Resize terminal (handles SIGWINCH automatically)
   */
  resizeSession(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Validate terminal size
    this.validateTerminalSize(cols, rows);

    try {
      session.ptyProcess.resize(cols, rows);
      session.cols = cols;
      session.rows = rows;
      session.lastActivityAt = Date.now();

      logger.debug('Terminal resized', {
        sessionId,
        cols,
        rows
      });
    } catch (error) {
      logger.error('Failed to resize terminal', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Get session information
   */
  getSession(sessionId: string): LocalTerminalSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * Destroy a terminal session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    
    // Remove from map immediately to prevent new operations
    this.sessions.delete(sessionId);
    
    try {
      // Send SIGTERM for graceful shutdown
      session.ptyProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown with timeout
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill after timeout if still running
          try {
            session.ptyProcess.kill('SIGKILL');
          } catch {
            // Ignore errors during force kill
          }
          resolve();
        }, 2000);
        
        const exitHandler = () => {
          clearTimeout(timeout);
          resolve();
        };

        // Use 'once', not 'onExit' for one-time listener
        session.ptyProcess.onExit(exitHandler);
      });
      
      logger.info('Local terminal session destroyed', { sessionId });
    } catch (error) {
      logger.error('Error destroying session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Ensure session is removed even if kill failed
      this.sessions.delete(sessionId);
    }
  }
  
  /**
   * Cleanup inactive sessions (30min timeout)
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 minutes
    
    const sessionsToClean: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivityAt > timeout) {
        sessionsToClean.push(sessionId);
      }
    }
    
    if (sessionsToClean.length > 0) {
      logger.info('Cleaning up inactive terminal sessions', {
        count: sessionsToClean.length
      });
      
      for (const sessionId of sessionsToClean) {
        await this.destroySession(sessionId);
      }
    }
  }
  
  /**
   * Start background cleanup job
   */
  private startCleanupJob(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveSessions().catch((error) => {
        logger.error('Cleanup job error', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, 5 * 60 * 1000); // Run every 5 minutes
  }
  
  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Destroy all sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.destroySession(sessionId);
    }
    
    logger.info('LocalTerminalService shutdown complete');
  }
}

export default new LocalTerminalService();

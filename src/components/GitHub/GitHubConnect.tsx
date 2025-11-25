import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { showToast as toast } from '../../utils/toast';
import clsx from 'clsx';
import {
  LuGithub,
  LuCloud,
  LuCloudOff,
  LuUpload,
  LuDownload,
  LuLogOut,
  LuChevronDown,
  LuLoader,
  LuCheck,
  LuCircleAlert,
  LuFolderGit2,
} from 'react-icons/lu';

export const GitHubConnect = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    gitHubStatus,
    gitHubUser,
    gitHubRepo,
    gitHubLastSync,
    gitHubError,
    connectGitHub,
    disconnectGitHub,
    pushToGitHub,
    pullFromGitHub,
    setRepoSelectorOpen,
  } = useNotesStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleConnect = useCallback(async () => {
    try {
      await connectGitHub();
      toast.success('Connected to GitHub');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect to GitHub');
    }
  }, [connectGitHub]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectGitHub();
      setIsOpen(false);
      toast.success('Disconnected from GitHub');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }, [disconnectGitHub]);

  const handlePush = useCallback(async () => {
    try {
      await pushToGitHub();
      toast.success('Notes pushed to GitHub');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to push notes');
    }
  }, [pushToGitHub]);

  const handlePull = useCallback(async () => {
    try {
      await pullFromGitHub();
      toast.success('Notes pulled from GitHub');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to pull notes');
    }
  }, [pullFromGitHub]);

  const handleSelectRepo = useCallback(() => {
    setIsOpen(false);
    setRepoSelectorOpen(true);
  }, [setRepoSelectorOpen]);

  // Format last sync time
  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const isSyncing = gitHubStatus === 'syncing';
  const isConnecting = gitHubStatus === 'connecting';
  const hasError = gitHubStatus === 'error';
  // Consider 'syncing' as connected for UI - we're actively using the connection
  const isConnected = gitHubStatus === 'connected' || isSyncing;

  // Get status icon for button
  const getStatusIcon = () => {
    if (isSyncing || isConnecting) {
      return <LuLoader className="w-4 h-4 animate-spin" />;
    }
    if (hasError) {
      return <LuCircleAlert className="w-4 h-4 text-red-500" />;
    }
    if (isConnected && gitHubRepo) {
      return <LuCloud className="w-4 h-4 text-green-500" />;
    }
    if (isConnected) {
      return <LuGithub className="w-4 h-4 text-stone-600 dark:text-stone-400" />;
    }
    return <LuCloudOff className="w-4 h-4 text-stone-400 dark:text-stone-500" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Tooltip content={isConnected ? (gitHubRepo || 'GitHub connected') : 'Connect to GitHub'}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="GitHub sync"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={clsx(
            'relative',
            hasError && 'text-red-500',
            isConnected && gitHubRepo && 'text-green-600 dark:text-green-400'
          )}
        >
          {getStatusIcon()}
          {isOpen && (
            <LuChevronDown className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-stone-400" />
          )}
        </Button>
      </Tooltip>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={clsx(
            'absolute right-0 top-full mt-2 w-72 z-50',
            'bg-white dark:bg-stone-900 rounded-xl',
            'border border-stone-200 dark:border-stone-800',
            'shadow-elevation-4 animate-scaleIn origin-top-right'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-3">
              <LuGithub className="w-5 h-5 text-stone-700 dark:text-stone-300" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  GitHub Sync
                </h3>
                {isConnected && gitHubUser && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                    {gitHubUser.login}
                  </p>
                )}
              </div>
              {isConnected && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">Connected</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-2">
            {!isConnected ? (
              // Not connected - show connect button
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'text-left text-sm font-medium',
                  'text-stone-700 dark:text-stone-300',
                  'hover:bg-stone-100 dark:hover:bg-stone-800',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-150'
                )}
                role="menuitem"
              >
                {isConnecting ? (
                  <LuLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <LuGithub className="w-4 h-4" />
                )}
                <span>{isConnecting ? 'Connecting...' : 'Connect GitHub Account'}</span>
              </button>
            ) : (
              // Connected - show repo and sync options
              <div className="space-y-1">
                {/* Repository selector */}
                <button
                  onClick={handleSelectRepo}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                    'text-left text-sm',
                    'text-stone-700 dark:text-stone-300',
                    'hover:bg-stone-100 dark:hover:bg-stone-800',
                    'transition-colors duration-150'
                  )}
                  role="menuitem"
                >
                  <LuFolderGit2 className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {gitHubRepo ? (
                      <>
                        <span className="font-medium truncate block">{gitHubRepo}</span>
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          Tap to change
                        </span>
                      </>
                    ) : (
                      <span className="text-stone-500">Select repository...</span>
                    )}
                  </div>
                </button>

                {gitHubRepo && (
                  <>
                    <div className="h-px bg-stone-200 dark:bg-stone-800 my-1" />

                    {/* Push */}
                    <button
                      onClick={handlePush}
                      disabled={isSyncing}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                        'text-left text-sm font-medium',
                        'text-stone-700 dark:text-stone-300',
                        'hover:bg-stone-100 dark:hover:bg-stone-800',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'transition-colors duration-150'
                      )}
                      role="menuitem"
                    >
                      {isSyncing ? (
                        <LuLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <LuUpload className="w-4 h-4" />
                      )}
                      <span>Push to GitHub</span>
                      {gitHubLastSync && (
                        <span className="ml-auto text-xs text-stone-400">
                          {formatLastSync(gitHubLastSync)}
                        </span>
                      )}
                    </button>

                    {/* Pull */}
                    <button
                      onClick={handlePull}
                      disabled={isSyncing}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                        'text-left text-sm font-medium',
                        'text-stone-700 dark:text-stone-300',
                        'hover:bg-stone-100 dark:hover:bg-stone-800',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'transition-colors duration-150'
                      )}
                      role="menuitem"
                    >
                      <LuDownload className="w-4 h-4" />
                      <span>Pull from GitHub</span>
                    </button>
                  </>
                )}

                <div className="h-px bg-stone-200 dark:bg-stone-800 my-1" />

                {/* Disconnect */}
                <button
                  onClick={handleDisconnect}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                    'text-left text-sm font-medium',
                    'text-red-600 dark:text-red-400',
                    'hover:bg-red-50 dark:hover:bg-red-900/20',
                    'transition-colors duration-150'
                  )}
                  role="menuitem"
                >
                  <LuLogOut className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>

          {/* Error footer */}
          {hasError && gitHubError && (
            <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 bg-red-50 dark:bg-red-900/10 rounded-b-xl">
              <p className="text-xs text-red-600 dark:text-red-400">{gitHubError}</p>
            </div>
          )}

          {/* Last sync footer */}
          {isConnected && gitHubLastSync && !hasError && (
            <div className="px-4 py-2 border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <LuCheck className="w-3 h-3" />
                <span>Last synced {formatLastSync(gitHubLastSync)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

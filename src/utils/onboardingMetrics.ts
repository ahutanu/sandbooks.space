const STORAGE_KEY = 'sandbooks_onboarding-events';
const MAX_EVENTS_STORED = 200;

export type OnboardingEvent =
  | 'code_run'
  | 'search_opened'
  | 'tag_added'
  | 'cloud_execution_toggled'
  | 'execution_mode_changed'
  | 'notes_exported'
  | 'notes_imported'
  | 'terminal_toggled'
  | 'markdown_imported'
  | 'docs_reset'
  | 'payload_link_opened'
  | 'payload_note_saved';

export interface OnboardingEventRecord {
  event: OnboardingEvent;
  timestamp: string;
  meta?: {
    noteId?: string | null;
    [key: string]: unknown;
  };
}

const safeRead = (): OnboardingEventRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const safeWrite = (events: OnboardingEventRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS_STORED)));
  } catch (_error) {
    // Swallow write errors; onboarding metrics must never break UX
  }
};

/**
 * Lightweight, local-first event logger for onboarding/activation signals.
 * Stores a rolling window in localStorage so we can inspect drop-off locally
 * without depending on network instrumentation.
 */
export function recordOnboardingEvent(
  event: OnboardingEvent,
  meta?: OnboardingEventRecord['meta']
): void {
  // Guard for non-browser environments just in case
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

  const events = safeRead();
  events.push({
    event,
    timestamp: new Date().toISOString(),
    meta: meta ? { ...meta } : undefined,
  });
  safeWrite(events);
}

/**
 * Helper for debugging or future dashboards.
 */
export function getOnboardingEvents(): OnboardingEventRecord[] {
  return safeRead();
}

export function clearOnboardingEvents(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // ignore
  }
}

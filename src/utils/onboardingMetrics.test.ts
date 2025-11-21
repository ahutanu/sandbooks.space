import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordOnboardingEvent,
  getOnboardingEvents,
  clearOnboardingEvents,
  type OnboardingEvent,
} from './onboardingMetrics';

describe('onboardingMetrics', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('recordOnboardingEvent', () => {
    it('records event to localStorage', () => {
      recordOnboardingEvent('code_run');

      const stored = localStorage.getItem('sandbooks_onboarding-events');
      expect(stored).toBeTruthy();

      const events = JSON.parse(stored!);
      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('code_run');
      expect(events[0].timestamp).toBeTruthy();
    });

    it('records event with metadata', () => {
      recordOnboardingEvent('code_run', { noteId: '123', language: 'python' });

      const events = getOnboardingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].meta).toEqual({ noteId: '123', language: 'python' });
    });

    it('appends multiple events', () => {
      recordOnboardingEvent('code_run');
      recordOnboardingEvent('search_opened');
      recordOnboardingEvent('tag_added');

      const events = getOnboardingEvents();
      expect(events).toHaveLength(3);
      expect(events[0].event).toBe('code_run');
      expect(events[1].event).toBe('search_opened');
      expect(events[2].event).toBe('tag_added');
    });

    it('creates ISO timestamp', () => {
      const beforeTime = new Date().toISOString();
      recordOnboardingEvent('code_run');
      const afterTime = new Date().toISOString();

      const events = getOnboardingEvents();
      expect(events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(events[0].timestamp >= beforeTime).toBe(true);
      expect(events[0].timestamp <= afterTime).toBe(true);
    });

    it('limits stored events to 200', () => {
      // Record 250 events
      for (let i = 0; i < 250; i++) {
        recordOnboardingEvent('code_run', { iteration: i });
      }

      const events = getOnboardingEvents();
      expect(events).toHaveLength(200);
      // Should keep the most recent 200 (150-249)
      expect(events[0].meta?.iteration).toBe(50);
      expect(events[199].meta?.iteration).toBe(249);
    });

    it('handles all event types', () => {
      const eventTypes: OnboardingEvent[] = [
        'code_run',
        'search_opened',
        'tag_added',
        'terminal_toggled',
        'notes_exported',
        'notes_imported',
        'cloud_execution_toggled',
        'docs_reset',
      ];

      eventTypes.forEach((event) => {
        recordOnboardingEvent(event);
      });

      const events = getOnboardingEvents();
      expect(events).toHaveLength(8);
      eventTypes.forEach((eventType, index) => {
        expect(events[index].event).toBe(eventType);
      });
    });

    it('handles localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => {
        recordOnboardingEvent('code_run');
      }).not.toThrow();

      setItemSpy.mockRestore();
    });

    it('does not record meta as undefined if not provided', () => {
      recordOnboardingEvent('code_run');
      const events = getOnboardingEvents();
      expect(events[0].meta).toBeUndefined();
    });

    it('copies meta object to avoid external mutations', () => {
      const meta = { noteId: '123' };
      recordOnboardingEvent('code_run', meta);
      meta.noteId = '456';

      const events = getOnboardingEvents();
      expect(events[0].meta?.noteId).toBe('123');
    });
  });

  describe('getOnboardingEvents', () => {
    it('returns empty array when no events recorded', () => {
      const events = getOnboardingEvents();
      expect(events).toEqual([]);
    });

    it('returns all recorded events', () => {
      recordOnboardingEvent('code_run');
      recordOnboardingEvent('search_opened');

      const events = getOnboardingEvents();
      expect(events).toHaveLength(2);
    });

    it('returns empty array if localStorage data is corrupted', () => {
      localStorage.setItem('sandbooks_onboarding-events', 'invalid json');
      const events = getOnboardingEvents();
      expect(events).toEqual([]);
    });

    it('returns empty array if localStorage data is not an array', () => {
      localStorage.setItem('sandbooks_onboarding-events', JSON.stringify({ not: 'array' }));
      const events = getOnboardingEvents();
      expect(events).toEqual([]);
    });

    it('handles read errors gracefully', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      getItemSpy.mockImplementation(() => {
        throw new Error('Read error');
      });

      const events = getOnboardingEvents();
      expect(events).toEqual([]);

      getItemSpy.mockRestore();
    });
  });

  describe('clearOnboardingEvents', () => {
    it('removes events from localStorage', () => {
      recordOnboardingEvent('code_run');
      recordOnboardingEvent('search_opened');

      expect(getOnboardingEvents()).toHaveLength(2);

      clearOnboardingEvents();

      expect(getOnboardingEvents()).toHaveLength(0);
      expect(localStorage.getItem('sandbooks_onboarding-events')).toBeNull();
    });

    it('handles clear errors gracefully', () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
      removeItemSpy.mockImplementation(() => {
        throw new Error('Remove error');
      });

      expect(() => {
        clearOnboardingEvents();
      }).not.toThrow();

      removeItemSpy.mockRestore();
    });

    it('is safe to call when no events exist', () => {
      expect(() => {
        clearOnboardingEvents();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles rapid event recording', () => {
      for (let i = 0; i < 10; i++) {
        recordOnboardingEvent('code_run', { iteration: i });
      }

      const events = getOnboardingEvents();
      expect(events).toHaveLength(10);
    });

    it('preserves event order', () => {
      recordOnboardingEvent('code_run', { order: 1 });
      recordOnboardingEvent('search_opened', { order: 2 });
      recordOnboardingEvent('tag_added', { order: 3 });

      const events = getOnboardingEvents();
      expect(events[0].meta?.order).toBe(1);
      expect(events[1].meta?.order).toBe(2);
      expect(events[2].meta?.order).toBe(3);
    });

    it('handles null noteId in meta', () => {
      recordOnboardingEvent('code_run', { noteId: null });
      const events = getOnboardingEvents();
      expect(events[0].meta?.noteId).toBeNull();
    });

    it('handles complex meta objects', () => {
      const complexMeta = {
        noteId: '123',
        tags: ['tag1', 'tag2'],
        nested: { value: 42 },
      };
      recordOnboardingEvent('code_run', complexMeta);

      const events = getOnboardingEvents();
      expect(events[0].meta).toEqual(complexMeta);
    });
  });
});

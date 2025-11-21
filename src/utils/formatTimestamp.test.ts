import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTimestamp } from './formatTimestamp';

describe('formatTimestamp', () => {
  let mockNow: Date;

  beforeEach(() => {
    mockNow = new Date('2025-11-21T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('invalid dates', () => {
    it('handles invalid ISO date strings', () => {
      const result = formatTimestamp('invalid-date');
      expect(result.relative).toBe('Unknown');
      expect(result.absolute).toBe('Unknown date');
      expect(result.datetime).toBe('invalid-date');
    });

    it('handles empty string', () => {
      const result = formatTimestamp('');
      expect(result.relative).toBe('Unknown');
      expect(result.absolute).toBe('Unknown date');
    });
  });

  describe('today - time-based relative format', () => {
    it('shows "Just now" for less than 1 minute ago', () => {
      const date = new Date('2025-11-21T11:59:30Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.relative).toBe('Just now');
      expect(result.absolute).toContain('November 21, 2025');
    });

    it('shows minutes for 1-59 minutes ago (singular)', () => {
      const date = new Date('2025-11-21T11:59:00Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.relative).toBe('1 minute ago');
    });

    it('shows minutes for 1-59 minutes ago (plural)', () => {
      const date = new Date('2025-11-21T11:30:00Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.relative).toBe('30 minutes ago');
    });

    it('shows hours for 60+ minutes ago today', () => {
      const date = new Date('2025-11-21T10:00:00Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.relative).toMatch(/\d+ hours? ago/);
    });
  });

  describe('yesterday', () => {
    it('shows "Yesterday" for dates from previous day', () => {
      const date = new Date('2025-11-20T15:00:00Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.relative).toBe('Yesterday');
      expect(result.absolute).toContain('November 20, 2025');
    });
  });

  describe('within last week', () => {
    it('shows relative time for 2-6 days ago', () => {
      const date = new Date('2025-11-18T12:00:00Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.relative).toMatch(/\d+ days? ago/);
    });
  });

  describe('within current year', () => {
    it('shows "MMM d" format for dates older than 7 days but within year', () => {
      const date = new Date('2025-10-15T12:00:00Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.relative).toBe('Oct 15');
      expect(result.absolute).toContain('October 15, 2025');
    });

    it('handles dates at the beginning of the year', () => {
      const date = new Date('2025-01-05T12:00:00Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.relative).toBe('Jan 5');
    });
  });

  describe('over 1 year old', () => {
    it('shows "MMM d, yyyy" format for dates over 1 year ago', () => {
      const date = new Date('2023-11-21T12:00:00Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.relative).toBe('Nov 21, 2023');
      expect(result.absolute).toContain('November 21, 2023');
    });

    it('handles very old dates', () => {
      const date = new Date('2020-05-15T12:00:00Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.relative).toBe('May 15, 2020');
    });
  });

  describe('return value structure', () => {
    it('returns object with relative, absolute, and datetime properties', () => {
      const isoDate = new Date('2025-11-21T10:30:00Z').toISOString();
      const result = formatTimestamp(isoDate);

      expect(result).toHaveProperty('relative');
      expect(result).toHaveProperty('absolute');
      expect(result).toHaveProperty('datetime');
      expect(result.datetime).toBe(isoDate);
    });

    it('absolute format includes time with AM/PM', () => {
      const date = new Date('2025-11-21T10:30:00Z').toISOString();
      const result = formatTimestamp(date);
      expect(result.absolute).toMatch(/at \d{1,2}:\d{2} [AP]M/);
    });
  });
});

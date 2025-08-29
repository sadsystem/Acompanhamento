import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nowInBrazil, toDateRefBR, formatDateTimeBR, formatDateTimeBRdash } from '../../utils/time';

describe('Time utilities', () => {
  beforeEach(() => {
    // Mock Date to return a consistent time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T14:30:45.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('nowInBrazil', () => {
    it('should return a date object for Brazilian timezone', () => {
      const result = nowInBrazil();
      expect(result).toBeInstanceOf(Date);
      // The function converts to Brazilian timezone, so we test the logic
      expect(typeof result.getTime()).toBe('number');
    });
  });

  describe('toDateRefBR', () => {
    it('should format date as YYYY-MM-DD', () => {
      const testDate = new Date('2024-01-15T10:30:00');
      const result = toDateRefBR(testDate);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toBe('2024-01-15');
    });

    it('should use current Brazilian time when no date provided', () => {
      const result = toDateRefBR();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should pad single digit months and days', () => {
      const testDate = new Date('2024-01-05T10:30:00');
      const result = toDateRefBR(testDate);
      expect(result).toBe('2024-01-05');
    });
  });

  describe('formatDateTimeBR', () => {
    it('should format date as DD/MM/YYYY HH:mm:ss', () => {
      const testDate = new Date('2024-01-15T14:30:45');
      const result = formatDateTimeBR(testDate);
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
      expect(result).toBe('15/01/2024 14:30:45');
    });

    it('should use current Brazilian time when no date provided', () => {
      const result = formatDateTimeBR();
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    });

    it('should pad single digit values', () => {
      const testDate = new Date('2024-01-05T09:05:03');
      const result = formatDateTimeBR(testDate);
      expect(result).toBe('05/01/2024 09:05:03');
    });
  });

  describe('formatDateTimeBRdash', () => {
    it('should format date with dash separator', () => {
      const testDate = new Date('2024-01-15T14:30:45');
      const result = formatDateTimeBRdash(testDate);
      expect(result).toBe('15/01/2024 - 14:30:45');
    });

    it('should contain dash separator between date and time', () => {
      const result = formatDateTimeBRdash();
      expect(result).toContain(' - ');
    });
  });
});

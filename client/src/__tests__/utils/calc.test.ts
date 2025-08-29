import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calcScore, uuid } from '../../utils/calc';
import { Answer, Question } from '../../config/types';

describe('Calculation utilities', () => {
  describe('calcScore', () => {
    const mockQuestions: Question[] = [
      {
        id: 'q1',
        text: 'Question 1',
        order: 1,
        goodWhenYes: true,
        requireReasonWhen: 'never'
      },
      {
        id: 'q2',
        text: 'Question 2',
        order: 2,
        goodWhenYes: false,
        requireReasonWhen: 'never'
      },
      {
        id: 'q3',
        text: 'Question 3',
        order: 3,
        goodWhenYes: true,
        requireReasonWhen: 'never'
      }
    ];

    it('should calculate perfect score when all answers are optimal', () => {
      const answers: Answer[] = [
        { questionId: 'q1', value: true },   // Good answer (goodWhenYes: true)
        { questionId: 'q2', value: false },  // Good answer (goodWhenYes: false)
        { questionId: 'q3', value: true }    // Good answer (goodWhenYes: true)
      ];

      const result = calcScore(answers, mockQuestions);
      expect(result).toBe(1.00);
    });

    it('should calculate zero score when all answers are suboptimal', () => {
      const answers: Answer[] = [
        { questionId: 'q1', value: false },  // Bad answer (goodWhenYes: true)
        { questionId: 'q2', value: true },   // Bad answer (goodWhenYes: false)
        { questionId: 'q3', value: false }   // Bad answer (goodWhenYes: true)
      ];

      const result = calcScore(answers, mockQuestions);
      expect(result).toBe(0.00);
    });

    it('should calculate partial score correctly', () => {
      const answers: Answer[] = [
        { questionId: 'q1', value: true },   // Good (1 point)
        { questionId: 'q2', value: true },   // Bad (0 points)
        { questionId: 'q3', value: true }    // Good (1 point)
      ];

      const result = calcScore(answers, mockQuestions);
      expect(result).toBe(0.67); // 2/3 = 0.6666... rounded to 0.67
    });

    it('should ignore answers for non-existent questions', () => {
      const answers: Answer[] = [
        { questionId: 'q1', value: true },     // Good (1 point)
        { questionId: 'nonexistent', value: true }, // Ignored
        { questionId: 'q2', value: false }     // Good (1 point)
      ];

      const result = calcScore(answers, mockQuestions.slice(0, 2)); // Only q1 and q2
      expect(result).toBe(1.00); // 2/2 = 1.00
    });

    it('should handle empty answers array', () => {
      const result = calcScore([], mockQuestions);
      expect(result).toBe(0.00);
    });

    it('should handle empty questions array', () => {
      const answers: Answer[] = [
        { questionId: 'q1', value: true }
      ];

      const result = calcScore(answers, []);
      expect(result).toBe(0.00); // 0/1 = 0 (fallback denominator)
    });
  });

  describe('uuid', () => {
    it('should generate a string', () => {
      const result = uuid();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate different values on multiple calls', () => {
      const id1 = uuid();
      const id2 = uuid();
      expect(id1).not.toBe(id2);
    });

    it('should use crypto.randomUUID when available', () => {
      const mockRandomUUID = vi.fn(() => 'mock-crypto-uuid');
      const originalCrypto = (globalThis as any).crypto;

      (globalThis as any).crypto = {
        randomUUID: mockRandomUUID
      };

      const result = uuid();
      expect(result).toBe('mock-crypto-uuid');
      expect(mockRandomUUID).toHaveBeenCalled();

      // Restore original
      (globalThis as any).crypto = originalCrypto;
    });

    it('should fallback to Math.random when crypto.randomUUID unavailable', () => {
      const originalCrypto = (globalThis as any).crypto;
      (globalThis as any).crypto = undefined;

      const mockRandom = vi.fn(() => 0.123456789);
      vi.spyOn(Math, 'random').mockImplementation(mockRandom);

      const result = uuid();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(mockRandom).toHaveBeenCalled();

      // Restore originals
      (globalThis as any).crypto = originalCrypto;
      vi.restoreAllMocks();
    });
  });
});

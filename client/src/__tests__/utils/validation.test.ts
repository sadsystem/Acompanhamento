import { describe, it, expect } from 'vitest';
import { 
  digitsOnly, 
  maskCPF, 
  validateCPF, 
  maskPhone, 
  validatePhone 
} from '../../utils/validation';

describe('Validation utilities', () => {
  describe('digitsOnly', () => {
    it('should extract only digits from string', () => {
      expect(digitsOnly('123.456.789-10')).toBe('12345678910');
      expect(digitsOnly('(11) 99999-9999')).toBe('11999999999');
      expect(digitsOnly('abc123def456')).toBe('123456');
      expect(digitsOnly('')).toBe('');
      expect(digitsOnly('abcdef')).toBe('');
    });
  });

  describe('maskCPF', () => {
    it('should format complete CPF with mask', () => {
      expect(maskCPF('12345678901')).toBe('123.456.789-01');
    });

    it('should format partial CPF progressively', () => {
      expect(maskCPF('123')).toBe('123');
      expect(maskCPF('123456')).toBe('123.456');
      expect(maskCPF('123456789')).toBe('123.456.789');
      expect(maskCPF('1234567890')).toBe('123.456.789-0');
    });

    it('should limit to 11 digits', () => {
      expect(maskCPF('123456789012345')).toBe('123.456.789-01');
    });

    it('should handle mixed input', () => {
      expect(maskCPF('123.456.789-01')).toBe('123.456.789-01');
      expect(maskCPF('abc123def456ghi789jkl01')).toBe('123.456.789-01');
    });
  });

  describe('validateCPF', () => {
    it('should validate correct CPF', () => {
      // Valid CPF numbers (using algorithm)
      expect(validateCPF('11144477735')).toBe(true);
      expect(validateCPF('111.444.777-35')).toBe(true);
    });

    it('should reject invalid CPF', () => {
      expect(validateCPF('12345678901')).toBe(false); // Invalid checksum
      expect(validateCPF('111.444.777-36')).toBe(false); // Invalid checksum
    });

    it('should reject CPF with invalid length', () => {
      expect(validateCPF('123456789')).toBe(false); // Too short
      expect(validateCPF('123456789012')).toBe(false); // Too long
    });

    it('should reject CPF with all same digits', () => {
      expect(validateCPF('11111111111')).toBe(false);
      expect(validateCPF('000.000.000-00')).toBe(false);
      expect(validateCPF('99999999999')).toBe(false);
    });

    it('should handle empty or invalid input', () => {
      expect(validateCPF('')).toBe(false);
      expect(validateCPF('abc')).toBe(false);
      expect(validateCPF('123abc456')).toBe(false);
    });
  });

  describe('maskPhone', () => {
    it('should format complete mobile phone (11 digits)', () => {
      expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
    });

    it('should format complete landline phone (10 digits)', () => {
      expect(maskPhone('1134567890')).toBe('(11) 3456-7890');
    });

    it('should format partial phone numbers progressively', () => {
      expect(maskPhone('11')).toBe('(11');
      expect(maskPhone('119')).toBe('(11) 9');
      expect(maskPhone('11987')).toBe('(11) 987');
      expect(maskPhone('1198765')).toBe('(11) 98765');
    });

    it('should limit to 11 digits', () => {
      expect(maskPhone('119876543219999')).toBe('(11) 98765-4321');
    });

    it('should handle mixed input', () => {
      expect(maskPhone('(11) 98765-4321')).toBe('(11) 98765-4321');
      expect(maskPhone('abc11def98765ghi4321')).toBe('(11) 98765-4321');
    });
  });

  describe('validatePhone', () => {
    it('should validate mobile phone (11 digits)', () => {
      expect(validatePhone('11987654321')).toBe(true);
      expect(validatePhone('(11) 98765-4321')).toBe(true);
    });

    it('should validate landline phone (10 digits)', () => {
      expect(validatePhone('1134567890')).toBe(true);
      expect(validatePhone('(11) 3456-7890')).toBe(true);
    });

    it('should reject phone with invalid length', () => {
      expect(validatePhone('123456789')).toBe(false); // Too short
      expect(validatePhone('119876543219')).toBe(false); // Too long
    });

    it('should handle empty or invalid input', () => {
      expect(validatePhone('')).toBe(false);
      expect(validatePhone('abc')).toBe(false);
    });
  });
});

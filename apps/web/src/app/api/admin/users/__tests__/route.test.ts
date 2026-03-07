import { describe, it, expect } from 'vitest';
import { sanitizeSearchInput } from '../route';

describe('Admin Users Route - Security', () => {
  describe('sanitizeSearchInput', () => {
    it('should sanitize search input to prevent SQL injection', () => {
      // Test with malicious SQL injection attempt
      const maliciousInput = `test%'; DROP TABLE users; --`;
      const sanitized = sanitizeSearchInput(maliciousInput);

      // Verify special characters are escaped (this prevents SQL injection in ILIKE context)
      expect(sanitized).toContain("\\'"); // single quote escaped
      expect(sanitized).toContain('\\%'); // percent escaped

      // Verify the dangerous SQL syntax is broken by escaping
      // The key is that the quote is escaped, breaking the SQL injection
      expect(sanitized).toMatch(/\\'; DROP/); // quote escaped before DROP

      // Verify no throw occurs
      expect(() => sanitizeSearchInput(maliciousInput)).not.toThrow();
    });

    it('should escape special ILIKE pattern characters', () => {
      const input = `test%_'"\\`;
      const sanitized = sanitizeSearchInput(input);

      expect(sanitized).toContain('\\%'); // percent
      expect(sanitized).toContain('\\_'); // underscore
      expect(sanitized).toContain("\\'"); // single quote
      expect(sanitized).toContain('\\"'); // double quote
      expect(sanitized).toContain('\\\\'); // backslash
    });

    it('should limit input length to 100 characters', () => {
      const longInput = 'a'.repeat(150);
      const sanitized = sanitizeSearchInput(longInput);

      expect(sanitized.length).toBeLessThanOrEqual(100);
    });

    it('should remove null bytes', () => {
      const inputWithNull = `test\x00dangerous`;
      const sanitized = sanitizeSearchInput(inputWithNull);

      expect(sanitized).not.toContain('\x00');
    });

    it('should handle empty string', () => {
      const sanitized = sanitizeSearchInput('');
      expect(sanitized).toBe('');
    });

    it('should handle normal search terms', () => {
      const normalInput = 'user@example.com';
      const sanitized = sanitizeSearchInput(normalInput);

      expect(sanitized).toBe('user@example.com');
    });
  });
});

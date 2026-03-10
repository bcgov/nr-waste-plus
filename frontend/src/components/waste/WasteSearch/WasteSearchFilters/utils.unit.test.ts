import { describe, expect, it } from 'vitest';

import { clientNumbersTransform } from './utils';

describe('clientNumbersTransform', () => {
  describe('toSearchParam', () => {
    it('converts array of CodeDescriptionDto to array of codes', () => {
      const input = [
        { code: 'A01', description: 'Client A' },
        { code: 'B02', description: 'Client B' },
      ];
      const result = clientNumbersTransform.clientNumbers.toSearchParam(input);
      expect(result).toEqual(['A01', 'B02']);
    });

    it('returns empty array for undefined', () => {
      const result = clientNumbersTransform.clientNumbers.toSearchParam(undefined);
      expect(result).toEqual([]);
    });

    it('returns empty array for empty input', () => {
      const result = clientNumbersTransform.clientNumbers.toSearchParam([]);
      expect(result).toEqual([]);
    });
  });

  describe('fromSearchParam', () => {
    it('converts comma-separated string to array of CodeDescriptionDto', () => {
      const result = clientNumbersTransform.clientNumbers.fromSearchParam('A01,B02');
      expect(result).toEqual([
        { code: 'A01', description: 'A01' },
        { code: 'B02', description: 'B02' },
      ]);
    });

    it('handles single code value as a string', () => {
      const result = clientNumbersTransform.clientNumbers.fromSearchParam('X99');
      expect(result).toEqual([{ code: 'X99', description: 'X99' }]);
    });

    it('converts array of codes to CodeDescriptionDto', () => {
      const result = clientNumbersTransform.clientNumbers.fromSearchParam(['C03', 'D04']);
      expect(result).toEqual([
        { code: 'C03', description: 'C03' },
        { code: 'D04', description: 'D04' },
      ]);
    });

    it('returns empty array for undefined', () => {
      const result = clientNumbersTransform.clientNumbers.fromSearchParam(undefined);
      expect(result).toEqual([]);
    });

    it('returns empty array for non-string and non-array values', () => {
      const result = clientNumbersTransform.clientNumbers.fromSearchParam(123);
      expect(result).toEqual([]);
    });

    it('trims whitespace from comma-separated values', () => {
      const result = clientNumbersTransform.clientNumbers.fromSearchParam('  A01  ,  B02  ');
      expect(result).toEqual([
        { code: 'A01', description: 'A01' },
        { code: 'B02', description: 'B02' },
      ]);
    });
  });

  describe('round-trip conversion', () => {
    it('converts to URL and back preserving codes', () => {
      const original = [
        { code: 'X01', description: 'Extra Client' },
        { code: 'Y02', description: 'Yellow Client' },
      ];

      const toUrl = clientNumbersTransform.clientNumbers.toSearchParam(original);
      const backToState = clientNumbersTransform.clientNumbers.fromSearchParam(toUrl);

      expect(backToState).toEqual([
        { code: 'X01', description: 'X01' },
        { code: 'Y02', description: 'Y02' },
      ]);
      // Codes are preserved, descriptions become the code value (fallback behavior)
    });
  });
});

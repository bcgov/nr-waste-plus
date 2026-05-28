import { describe, it, expect } from 'vitest';
import { required, noSpecialChars, type ValidatorResult, type Validator } from './validators';

describe('validators', () => {
  describe('required', () => {
    describe('with default message', () => {
      const validator = required();

      it('should return "Required" for undefined', () => {
        expect(validator(undefined)).toBe('Required');
      });

      it('should return "Required" for null', () => {
        expect(validator(null)).toBe('Required');
      });

      it('should return "Required" for empty string', () => {
        expect(validator('')).toBe('Required');
      });

      it('should return undefined for non-empty string', () => {
        expect(validator('hello')).toBeUndefined();
      });

      it('should return undefined for string with spaces', () => {
        expect(validator('  ')).toBeUndefined();
      });

      it('should return undefined for number 0', () => {
        expect(validator(0)).toBeUndefined();
      });

      it('should return undefined for number 1', () => {
        expect(validator(1)).toBeUndefined();
      });

      it('should return undefined for negative number', () => {
        expect(validator(-5)).toBeUndefined();
      });

      it('should return undefined for false', () => {
        expect(validator(false)).toBeUndefined();
      });

      it('should return undefined for true', () => {
        expect(validator(true)).toBeUndefined();
      });

      it('should return undefined for empty array', () => {
        expect(validator([])).toBeUndefined();
      });

      it('should return undefined for empty object', () => {
        expect(validator({})).toBeUndefined();
      });

      it('should return undefined for NaN', () => {
        expect(validator(NaN)).toBeUndefined();
      });
    });

    describe('with custom message', () => {
      const customMessage = 'This field is required';
      const validator = required(customMessage);

      it('should return custom message for undefined', () => {
        expect(validator(undefined)).toBe(customMessage);
      });

      it('should return custom message for null', () => {
        expect(validator(null)).toBe(customMessage);
      });

      it('should return custom message for empty string', () => {
        expect(validator('')).toBe(customMessage);
      });

      it('should return undefined for valid value', () => {
        expect(validator('test')).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle string "0" as valid', () => {
        const validator = required();
        expect(validator('0')).toBeUndefined();
      });

      it('should handle string "false" as valid', () => {
        const validator = required();
        expect(validator('false')).toBeUndefined();
      });

      it('should handle single character', () => {
        const validator = required();
        expect(validator('a')).toBeUndefined();
      });

      it('should work with very long string', () => {
        const validator = required();
        const longString = 'a'.repeat(10000);
        expect(validator(longString)).toBeUndefined();
      });
    });
  });

  describe('noSpecialChars', () => {
    describe('with default message', () => {
      const validator = noSpecialChars();

      it('should allow lowercase letters', () => {
        expect(validator('abcdefghijklmnopqrstuvwxyz')).toBeUndefined();
      });

      it('should allow uppercase letters', () => {
        expect(validator('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBeUndefined();
      });

      it('should allow numbers', () => {
        expect(validator('0123456789')).toBeUndefined();
      });

      it('should allow spaces', () => {
        expect(validator('hello world')).toBeUndefined();
      });

      it('should allow mixed alphanumeric with spaces', () => {
        expect(validator('Test 123 Value')).toBeUndefined();
      });

      it('should return "Invalid characters" for exclamation mark', () => {
        expect(validator('hello!')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for at symbol', () => {
        expect(validator('test@example')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for hash', () => {
        expect(validator('test#hash')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for dollar', () => {
        expect(validator('test$value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for percent', () => {
        expect(validator('100%')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for hyphen', () => {
        expect(validator('test-value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for underscore', () => {
        expect(validator('test_value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for dot', () => {
        expect(validator('test.value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for comma', () => {
        expect(validator('test,value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for colon', () => {
        expect(validator('test:value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for semicolon', () => {
        expect(validator('test;value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for parenthesis', () => {
        expect(validator('test(value)')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for bracket', () => {
        expect(validator('test[value]')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for brace', () => {
        expect(validator('test{value}')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for forward slash', () => {
        expect(validator('test/value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for backslash', () => {
        expect(validator('test\\value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for pipe', () => {
        expect(validator('test|value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for question mark', () => {
        expect(validator('test?')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for angle brackets', () => {
        expect(validator('test<value>')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for equals', () => {
        expect(validator('test=value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for plus', () => {
        expect(validator('test+value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for apostrophe', () => {
        expect(validator("test'value")).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for double quote', () => {
        expect(validator('test"value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for backtick', () => {
        expect(validator('test`value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for tilde', () => {
        expect(validator('test~value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for unicode special character', () => {
        expect(validator('test™value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for emoji', () => {
        expect(validator('test😀value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for accented character', () => {
        expect(validator('testévalue')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for multiple special chars', () => {
        expect(validator('test!@#$%value')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for newline', () => {
        expect(validator('test\nvalue')).toBe('Invalid characters');
      });

      it('should return "Invalid characters" for tab', () => {
        expect(validator('test\tvalue')).toBe('Invalid characters');
      });
    });

    describe('with custom message', () => {
      const customMessage = 'Only letters, numbers, and spaces allowed';
      const validator = noSpecialChars(customMessage);

      it('should return custom message for invalid characters', () => {
        expect(validator('test!')).toBe(customMessage);
      });

      it('should return undefined for valid input', () => {
        expect(validator('valid input')).toBeUndefined();
      });

      it('should return custom message for multiple violations', () => {
        expect(validator('test@#$')).toBe(customMessage);
      });
    });

    describe('edge cases', () => {
      const validator = noSpecialChars();

      it('should handle empty string', () => {
        expect(validator('')).toBeUndefined();
      });

      it('should handle single character letter', () => {
        expect(validator('a')).toBeUndefined();
      });

      it('should handle single character number', () => {
        expect(validator('5')).toBeUndefined();
      });

      it('should handle single space', () => {
        expect(validator(' ')).toBeUndefined();
      });

      it('should handle multiple consecutive spaces', () => {
        expect(validator('   ')).toBeUndefined();
      });

      it('should handle leading spaces', () => {
        expect(validator('  hello')).toBeUndefined();
      });

      it('should handle trailing spaces', () => {
        expect(validator('hello  ')).toBeUndefined();
      });

      it('should handle very long valid string', () => {
        const longString = 'a'.repeat(10000);
        expect(validator(longString)).toBeUndefined();
      });

      it('should handle long string with special char at end', () => {
        const longString = 'a'.repeat(9999) + '!';
        expect(validator(longString)).toBe('Invalid characters');
      });
    });
  });

  describe('type exports', () => {
    it('should export ValidatorResult type', () => {
      const result: ValidatorResult = undefined;
      expect(result).toBeUndefined();
    });

    it('should export Validator type', () => {
      const validator: Validator<string> = (value) => undefined;
      expect(typeof validator).toBe('function');
    });
  });

  describe('validator composition', () => {
    it('should allow chaining multiple validators', () => {
      const reqValidator = required('Required');
      const charValidator = noSpecialChars('No special chars');

      expect(reqValidator('')).toBe('Required');
      expect(charValidator('test!')).toBe('No special chars');
      expect(reqValidator('valid')).toBeUndefined();
      expect(charValidator('valid')).toBeUndefined();
    });

    it('should maintain separate validator state', () => {
      const validator1 = required('Message 1');
      const validator2 = required('Message 2');

      expect(validator1(undefined)).toBe('Message 1');
      expect(validator2(undefined)).toBe('Message 2');
    });
  });
});

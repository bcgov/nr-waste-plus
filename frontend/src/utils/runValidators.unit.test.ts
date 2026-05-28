import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

import { runValidators } from './runValidators';

import type { Validator } from './validators';

describe('runValidators', () => {
  describe('basic functionality', () => {
    it('should return undefined when no validators fail', async () => {
      const validator1: Validator<string> = () => undefined;
      const validator2: Validator<string> = () => undefined;

      const result = await runValidators('test', [validator1, validator2]);
      expect(result).toBeUndefined();
    });

    it('should return error from first failing validator', async () => {
      const validator1: Validator<string> = () => undefined;
      const validator2: Validator<string> = () => 'Validator 2 failed';
      const validator3: Validator<string> = () => 'Validator 3 failed';

      const result = await runValidators('test', [validator1, validator2, validator3]);
      expect(result).toBe('Validator 2 failed');
    });

    it('should stop at first failing validator and not run subsequent validators', async () => {
      const validator1 = vi.fn(() => undefined);
      const validator2 = vi.fn(() => 'Error');
      const validator3 = vi.fn(() => 'Error');

      await runValidators('test', [validator1, validator2, validator3]);

      expect(validator1).toHaveBeenCalledTimes(1);
      expect(validator2).toHaveBeenCalledTimes(1);
      expect(validator3).toHaveBeenCalledTimes(0);
    });

    it('should pass the value to each validator', async () => {
      const testValue = 'test-value';
      const validator1 = vi.fn(() => undefined);
      const validator2 = vi.fn(() => undefined);

      await runValidators(testValue, [validator1, validator2]);

      expect(validator1).toHaveBeenCalledWith(testValue);
      expect(validator2).toHaveBeenCalledWith(testValue);
    });

    it('should handle empty validators array', async () => {
      const result = await runValidators('test', []);
      expect(result).toBeUndefined();
    });
  });

  describe('async validators', () => {
    it('should handle async validators returning undefined', async () => {
      const validator: Validator<string> = async () => undefined;

      const result = await runValidators('test', [validator]);
      expect(result).toBeUndefined();
    });

    it('should handle async validators returning error', async () => {
      const validator: Validator<string> = async () => 'Async error';

      const result = await runValidators('test', [validator]);
      expect(result).toBe('Async error');
    });

    it('should handle mix of sync and async validators', async () => {
      const syncValidator: Validator<string> = () => undefined;
      const asyncValidator: Validator<string> = async () => 'Async error';

      const result = await runValidators('test', [syncValidator, asyncValidator]);
      expect(result).toBe('Async error');
    });

    it('should handle async validator that rejects', async () => {
      const validator: Validator<string> = async () => {
        throw new Error('Async rejection');
      };

      await expect(runValidators('test', [validator])).rejects.toThrow('Async rejection');
    });

    it('should handle async validators with delay', async () => {
      const validator: Validator<string> = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'Delayed error';
      };

      const result = await runValidators('test', [validator]);
      expect(result).toBe('Delayed error');
    });
  });

  describe('schema validation', () => {
    it('should validate with schema when provided', async () => {
      const schema = z.string().min(5);

      const result = await runValidators('ab', [], schema);
      expect(result).toBeDefined();
      expect(result).toMatch(/String must contain at least 5|Too small.*>=5/);
    });

    it('should return undefined when schema validation passes', async () => {
      const schema = z.string().min(5);

      const result = await runValidators('abcdef', [], schema);
      expect(result).toBeUndefined();
    });

    it('should validate with complex schema', async () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
      });

      const result = await runValidators({ name: '', age: -1 }, [], schema);
      expect(result).toBeDefined();
    });

    it('should use schema validation error message', async () => {
      const schema = z.string().max(3);

      const result = await runValidators('abcdefgh', [], schema);
      expect(result).toMatch(/String must contain at most 3|Too big.*<=3/);
    });

    it('should return first schema error message only', async () => {
      const schema = z.object({
        name: z.string().min(5),
        age: z.number().min(18),
      });

      const result = await runValidators({ name: 'ab', age: 10 }, [], schema);
      expect(result).toBeDefined();
      // Should include the first error
      expect(result).toMatch(/must contain at least 5|Too small.*>=5|at least|>= /);
    });
  });

  describe('validators and schema combined', () => {
    it('should run validators before schema', async () => {
      const validator: Validator<string> = () => 'Validator error';
      const schema = z.string().min(5);

      const result = await runValidators('ab', [validator], schema);
      expect(result).toBe('Validator error');
    });

    it('should run schema if validators pass', async () => {
      const validator: Validator<string> = () => undefined;
      const schema = z.string().min(5);

      const result = await runValidators('ab', [validator], schema);
      expect(result).toBeDefined();
    });

    it('should pass only when both validators and schema pass', async () => {
      const validator: Validator<string> = () => undefined;
      const schema = z.string().min(5);

      const result = await runValidators('abcdef', [validator], schema);
      expect(result).toBeUndefined();
    });

    it('should handle multiple validators before schema validation', async () => {
      const validator1: Validator<string> = () => undefined;
      const validator2: Validator<string> = () => undefined;
      const schema = z.string().min(5);

      const result = await runValidators('abcdef', [validator1, validator2], schema);
      expect(result).toBeUndefined();
    });

    it('should stop at first validator error before checking schema', async () => {
      const validator1: Validator<string> = () => undefined;
      const validator2: Validator<string> = () => 'Validator 2 error';
      const schema = z.string().min(100); // Would fail

      const result = await runValidators('ab', [validator1, validator2], schema);
      expect(result).toBe('Validator 2 error');
    });
  });

  describe('error handling', () => {
    it('should handle ZodError correctly', async () => {
      const schema = z.string().email();

      const result = await runValidators('not-an-email', [], schema);
      expect(result).toBeDefined();
      expect(result).toContain('Invalid email');
    });

    it('should return fallback message for non-ZodError', async () => {
      const schema = z.string().refine(
        () => {
          throw new Error('Non-Zod error');
        },
        { message: 'Custom error' },
      );

      const result = await runValidators('test', [], schema);
      // When refine throws, the error message is captured and returned
      expect(result).toBeDefined();
      expect(result).toBe('Non-Zod error');
    });

    it('should handle schema with undefined error message', async () => {
      const schema = z.string().min(5);
      const errorValue = 'ab';

      const result = await runValidators(errorValue, [], schema);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('edge cases and performance', () => {
    it('should handle undefined value', async () => {
      const validator: Validator<unknown> = () => undefined;

      const result = await runValidators(undefined, [validator]);
      expect(result).toBeUndefined();
    });

    it('should handle null value', async () => {
      const validator: Validator<unknown> = () => undefined;

      const result = await runValidators(null, [validator]);
      expect(result).toBeUndefined();
    });

    it('should handle empty string', async () => {
      const validator: Validator<string> = () => undefined;

      const result = await runValidators('', [validator]);
      expect(result).toBeUndefined();
    });

    it('should handle complex object', async () => {
      const validator: Validator<Record<string, unknown>> = () => undefined;
      const complexObj = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
      };

      const result = await runValidators(complexObj, [validator]);
      expect(result).toBeUndefined();
    });

    it('should handle large array of validators', async () => {
      const validators: Validator<string>[] = Array.from({ length: 100 }, () => () => undefined);

      const result = await runValidators('test', validators);
      expect(result).toBeUndefined();
    });

    it('should handle validator that returns empty string as valid error', async () => {
      const validator: Validator<string> = () => '';

      const result = await runValidators('test', [validator]);
      // Empty string is falsy but still a return, so it won't be treated as error in the current implementation
      // This test documents the behavior
      expect(result).toBeUndefined();
    });
  });

  describe('validator with different types', () => {
    it('should validate number', async () => {
      const validator: Validator<number> = (value) => (value > 0 ? undefined : 'Must be positive');

      const result = await runValidators(5, [validator]);
      expect(result).toBeUndefined();

      const resultFail = await runValidators(-5, [validator]);
      expect(resultFail).toBe('Must be positive');
    });

    it('should validate array', async () => {
      const validator: Validator<string[]> = (value) =>
        value.length > 0 ? undefined : 'Array must not be empty';

      const result = await runValidators(['a', 'b'], [validator]);
      expect(result).toBeUndefined();

      const resultFail = await runValidators([], [validator]);
      expect(resultFail).toBe('Array must not be empty');
    });

    it('should validate object', async () => {
      const validator: Validator<{ name: string }> = (value) =>
        value.name ? undefined : 'Name is required';

      const result = await runValidators({ name: 'test' }, [validator]);
      expect(result).toBeUndefined();

      const resultFail = await runValidators({ name: '' }, [validator]);
      expect(resultFail).toBe('Name is required');
    });
  });

  describe('async performance', () => {
    it('should handle sequential async validators', async () => {
      const asyncValidator1: Validator<string> = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return undefined;
      };
      const asyncValidator2: Validator<string> = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return undefined;
      };

      const startTime = Date.now();
      await runValidators('test', [asyncValidator1, asyncValidator2]);
      const elapsed = Date.now() - startTime;

      // Should take at least 20ms (10 + 10) since they run sequentially
      expect(elapsed).toBeGreaterThanOrEqual(15);
    });

    it('should complete all validators before schema', async () => {
      const callOrder: string[] = [];

      const validator: Validator<string> = () => {
        callOrder.push('validator');
        return undefined;
      };

      const schema = z.string().transform((val) => {
        callOrder.push('schema');
        return val;
      });

      await runValidators('test', [validator], schema);

      expect(callOrder).toEqual(['validator', 'schema']);
    });
  });

  describe('real-world scenarios', () => {
    it('should validate a form field with multiple rules', async () => {
      const minLength: Validator<string> = (value) =>
        value.length >= 3 ? undefined : 'Must be at least 3 characters';
      const noSpecialChars: Validator<string> = (value) =>
        /^[a-zA-Z0-9 ]+$/.test(value) ? undefined : 'No special characters allowed';
      const schema = z.string().min(3);

      // Valid case
      const validResult = await runValidators('John Doe', [minLength, noSpecialChars], schema);
      expect(validResult).toBeUndefined();

      // Invalid case - too short
      const tooShort = await runValidators('Jo', [minLength, noSpecialChars], schema);
      expect(tooShort).toBe('Must be at least 3 characters');

      // Invalid case - special characters
      const specialChars = await runValidators('John@Doe', [minLength, noSpecialChars], schema);
      expect(specialChars).toBe('No special characters allowed');
    });

    it('should handle conditional validation', async () => {
      const emailValidator: Validator<{ isEmailRequired: boolean; email: string }> = ({
        isEmailRequired,
        email,
      }) => (!isEmailRequired || email ? undefined : 'Email is required when flag is set');

      const result1 = await runValidators({ isEmailRequired: false, email: '' }, [emailValidator]);
      expect(result1).toBeUndefined();

      const result2 = await runValidators({ isEmailRequired: true, email: '' }, [emailValidator]);
      expect(result2).toBe('Email is required when flag is set');

      const result3 = await runValidators({ isEmailRequired: true, email: 'test@example.com' }, [
        emailValidator,
      ]);
      expect(result3).toBeUndefined();
    });
  });
});

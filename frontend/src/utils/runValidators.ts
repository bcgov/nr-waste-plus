import { ZodError, type ZodType } from 'zod';

import type { Validator } from './validators';

export async function runValidators<T>(
  value: T,
  validators: Validator<T>[],
  schema?: ZodType,
): Promise<string | undefined> {
  // Run custom validators first
  for (const validator of validators) {
    const error = await Promise.resolve(validator(value));

    if (error) {
      return error;
    }
  }

  // Then run schema validation if provided
  if (schema) {
    try {
      await schema.parseAsync(value);
    } catch (error) {
      if (error instanceof ZodError) {
        return error.issues[0]?.message || 'Validation failed';
      }
      // Handle non-ZodError exceptions
      if (error instanceof Error) {
        return error.message;
      }
      return 'Validation failed';
    }
  }

  return undefined;
}

import type { Validator } from './validators';

export async function runValidators<T>(
  value: T,
  validators: Validator<T>[],
): Promise<string | undefined> {
  for (const validator of validators) {
    const error = await Promise.resolve(validator(value));

    if (error) {
      return error;
    }
  }

  return undefined;
}

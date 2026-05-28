export type ValidatorResult = string | undefined | Promise<string | undefined>;
export type Validator<T> = (value: T) => ValidatorResult;

export const required =
  (message = 'Required'): Validator<unknown> =>
  (value) => {
    if (value === undefined || value === null || value === '') {
      return message;
    }

    return undefined;
  };

export const noSpecialChars =
  (message = 'Invalid characters'): Validator<string> =>
  (value) => {
    if (!/^[a-zA-Z0-9 ]*$/.test(value)) {
      return message;
    }

    return undefined;
  };

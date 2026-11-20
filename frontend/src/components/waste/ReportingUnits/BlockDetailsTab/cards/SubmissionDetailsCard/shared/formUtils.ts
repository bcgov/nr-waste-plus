/** Extracts the first string validation error from a TanStack field error array. */
export const fieldError = (errors: readonly unknown[]): string | undefined => {
  const first = errors.find((error) => typeof error === 'string' && error.length > 0);
  return typeof first === 'string' ? first : undefined;
};

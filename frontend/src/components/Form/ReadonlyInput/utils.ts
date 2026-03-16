/**
 * Converts whitespace-delimited text into a lowercase kebab-case identifier.
 *
 * @param text The text to normalize.
 * @returns The kebab-case representation.
 */
export const toKebabCase = (text: string): string => {
  return text.trim().split(' ').filter(Boolean).join('-').toLowerCase();
};

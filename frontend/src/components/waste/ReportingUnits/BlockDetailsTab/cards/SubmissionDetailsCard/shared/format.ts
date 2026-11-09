import type { CodeDescriptionDto } from '@/types/search.types';

/**
 * Finds the option matching a stored code.
 *
 * @param options the option list to search
 * @param code the stored code; empty string matches nothing
 * @returns the matching option, or null when the code is unset or unknown
 */
export const toSelectedItem = (
  options: readonly CodeDescriptionDto[],
  code: string,
): CodeDescriptionDto | null => options.find((option) => option.code === code) ?? null;

/** Resolves selected codes to their option objects, preserving selection order. */
export const toSelectedItems = (
  options: readonly CodeDescriptionDto[],
  codes: readonly string[],
): CodeDescriptionDto[] =>
  codes
    .map((code) => options.find((option) => option.code === code))
    .filter((option): option is CodeDescriptionDto => Boolean(option));

export const toYesNo = (value: boolean): string => (value ? 'Yes' : 'No');

export const toDateValue = (isoDate: string): Date[] =>
  isoDate ? [new Date(`${isoDate}T00:00:00`)] : [];

export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Normalises a timber mark entry: strips non-alphanumerics and uppercases (INT-1.6a, BR-2). */
export const normalizeTimberMark = (value: string): string =>
  value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

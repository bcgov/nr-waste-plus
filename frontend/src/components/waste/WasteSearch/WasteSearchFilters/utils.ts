import type { CodeDescriptionDto } from '@/types/search.types';

const toCodeDescriptionDtos = (values: string[]): CodeDescriptionDto[] =>
  values.map((code) => ({ code, description: code }));

export const clientNumbersTransform = {
  clientNumbers: {
    toSearchParam: (value: CodeDescriptionDto[] | undefined) =>
      value?.map((item) => item.code) ?? [],
    fromSearchParam: (value: unknown): CodeDescriptionDto[] => {
      if (value === undefined) return [];
      if (typeof value === 'string') {
        // Handle comma-separated string from URL
        const codes = value
          .split(',')
          .map((code) => code.trim())
          .filter(Boolean);
        return toCodeDescriptionDtos(codes);
      }
      return Array.isArray(value)
        ? toCodeDescriptionDtos(value.map((code) => String(code).trim()).filter(Boolean))
        : [];
    },
  },
};

/**
 * URL transform for the search-source flag (`legacy`, #1238).
 *
 * The flag is held in filter state as the string `'false'` (PostgreSQL) or `undefined`
 * (legacy, the default): a plain boolean cannot represent the PostgreSQL selection here
 * because empty-value cleanup and the URL sync both drop `false`.
 *
 * - `toSearchParam` returns the boolean primitive `false` so the URL sync writes a clean
 *   unquoted `legacy=false` (the router otherwise JSON-quotes string values that parse as
 *   JSON, which would corrupt the flag on reload).
 * - `fromSearchParam` normalizes anything falsey-for-legacy back to `'false'` and treats
 *   every other value (including `true` and garbage) as the absent/legacy default.
 */
export const legacyTransform = {
  legacy: {
    toSearchParam: (value: string | undefined) => (value === 'false' ? false : undefined),
    fromSearchParam: (value: unknown): string | undefined =>
      value === false || value === 'false' || value === '"false"' ? 'false' : undefined,
  },
};

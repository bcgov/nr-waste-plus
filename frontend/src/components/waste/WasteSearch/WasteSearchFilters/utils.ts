import type { CodeDescriptionDto } from '@/services/types';

export const clientNumbersTransform = {
  clientNumbers: {
    toSearchParam: (value: CodeDescriptionDto[] | undefined) =>
      value?.map((item) => item.code) ?? [],
    fromSearchParam: (value: unknown): CodeDescriptionDto[] => {
      if (value === undefined) return [];
      if (typeof value === 'string') {
        // Handle comma-separated string from URL
        return value.split(',').map((code) => ({ code: code.trim(), description: code.trim() }));
      }
      return Array.isArray(value)
        ? value.map((code) => ({ code: String(code), description: String(code) }))
        : [];
    },
  },
};

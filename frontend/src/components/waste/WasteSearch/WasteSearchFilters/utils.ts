import type { CodeDescriptionDto } from '@/services/types';

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

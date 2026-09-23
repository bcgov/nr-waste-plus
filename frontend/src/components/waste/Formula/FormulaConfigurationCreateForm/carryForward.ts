import type { FormulaItemDto } from '@/services/formulaConfiguration.types.ts';

interface FormulaDraftValue {
  expression: string;
  validationErrors: FormulaItemDto['validationErrors'];
}

export function carryForwardFormulaValues(
  current: Record<string, FormulaDraftValue>,
  currentKeys: readonly string[],
  source: readonly FormulaItemDto[],
  editedKeys: ReadonlySet<string>,
): Record<string, FormulaDraftValue> {
  const sourceByKey = new Map(source.map((formula) => [formula.formulaKey, formula]));

  return Object.fromEntries(
    currentKeys.map((key) => {
      const previous = sourceByKey.get(key);
      if (editedKeys.has(key)) {
        return [key, current[key] ?? { expression: '1', validationErrors: [] }];
      }

      return [
        key,
        {
          expression: previous?.expression ?? '1',
          validationErrors: [],
        },
      ];
    }),
  );
}

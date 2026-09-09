import { useId } from 'react';

import ColorTag, { type CarbonColors } from '@/components/core/Tags/ColorTag';

/**
 * Props for the {@link DependencyGraph} component.
 *
 * `fixedParamNames` takes precedence over `dynamicParamNames` when a variable
 * is present in both sets — fixed params are always rendered in blue.
 */
export interface DependencyGraphProps {
  /** Variable names the current formula references. */
  usedVariables: string[];
  /**
   * Full merged scope used for value lookup.
   * Each entry maps a variable name to its resolved numeric value.
   */
  mergedScope: Record<string, number>;
  /**
   * Names of fixed (static) parameters.
   * Variables in this set are rendered with a `blue` tag.
   * Takes precedence over `dynamicParamNames`.
   */
  fixedParamNames: Set<string>;
  /**
   * Names of dynamic (computed) parameters.
   * Variables in this set (and not in `fixedParamNames`) are rendered with a `teal` tag.
   * Variables absent from both sets fall back to a `green` tag.
   */
  dynamicParamNames: Set<string>;
}

/** Result of classifying a single formula variable for display purposes. */
interface VariableClassification {
  /** Carbon tag colour to use for the variable. */
  color: CarbonColors;
  /** Human-readable label surfaced in the tooltip. */
  label: string;
}

/**
 * Classifies a formula variable by membership in `fixedParamNames` or
 * `dynamicParamNames`, returning the display colour and tooltip label.
 *
 * Priority:
 * 1. `fixed` / `blue`           — variable is in `fixedParamNames`.
 * 2. `dynamic` / `teal`         — variable is in `dynamicParamNames`.
 * 3. `not classified` / `green` — variable is in neither named set.
 *
 * Exported so that consumers or tests can classify variables without rendering.
 *
 * @param name - Variable name to classify.
 * @param fixedParamNames - Set of fixed parameter names.
 * @param dynamicParamNames - Set of dynamic parameter names.
 * @returns A {@link VariableClassification} with `color` and `label`.
 */
export function resolveVariableClassification(
  name: string,
  fixedParamNames: Set<string>,
  dynamicParamNames: Set<string>,
): VariableClassification {
  if (fixedParamNames.has(name)) return { color: 'blue', label: 'fixed' };
  if (dynamicParamNames.has(name)) return { color: 'teal', label: 'dynamic' };
  return { color: 'green', label: 'not classified' };
}

/**
 * Renders the dependency graph for a formula — a labelled list of colour-coded
 * {@link ColorTag} elements, one per variable referenced by the formula.
 *
 * **Colour rules (in priority order):**
 * 1. `blue`  — variable is a fixed param (`fixedParamNames`).
 * 2. `teal`  — variable is a dynamic param (`dynamicParamNames`).
 * 3. `green` — variable is in neither named set (`not classified`).
 *
 * When a variable has no entry in `mergedScope`, its displayed value is `N/A`.
 *
 * @returns a `<section>` landmark region containing a labelled tag list,
 *   or `null` when `usedVariables` is empty.
 *
 * @see {@link ColorTag} for the tag rendering used for each variable.
 * @see {@link resolveVariableClassification} for the colour/label logic.
 *
 * @example
 * ```tsx
 * <DependencyGraph
 *   usedVariables={['rate', 'qty']}
 *   mergedScope={{ rate: 0.15, qty: 100 }}
 *   fixedParamNames={new Set(['rate'])}
 *   dynamicParamNames={new Set(['qty'])}
 * />
 * ```
 */
const DependencyGraph: React.FC<DependencyGraphProps> = ({
  usedVariables,
  mergedScope,
  fixedParamNames,
  dynamicParamNames,
}) => {
  const labelId = useId();

  if (usedVariables.length === 0) return null;

  return (
    <section className="formula-input__section" role="region" aria-label="Dependency graph">
      <p id={labelId} className="formula-input__section-label">
        Variables used in formula
      </p>
      <ul className="formula-input__tags" aria-labelledby={labelId}>
        {usedVariables.map((name) => {
          const { color } = resolveVariableClassification(name, fixedParamNames, dynamicParamNames);

          return (
            <li key={name}>
              <ColorTag
                value={{ code: name, description: String(mergedScope[name] ?? 'N/A') }}
                colorMap={{ [name]: color }}
                showTooltip
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default DependencyGraph;

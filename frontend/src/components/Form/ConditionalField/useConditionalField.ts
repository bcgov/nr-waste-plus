import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

import type { Condition, UseConditionalFieldOptions } from './types';

/**
 * Reads a value from a plain object by a dot-separated path string.
 *
 * Supports both top-level keys (`'status'`) and nested paths (`'address.city'`).
 * Returns `undefined` when any segment along the path is missing, `null`, or not
 * an object, rather than throwing.
 *
 * @param obj - The root object to traverse.
 * @param path - A dot-separated key path (e.g. `'address.city'`).
 * @returns The value at the path, or `undefined` if unreachable.
 */
export function getIn(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Evaluates a single {@link Condition} against a watched field value.
 *
 * This is a pure function — it has no side-effects and depends only on its
 * arguments, making it straightforward to unit-test in isolation.
 *
 * @param condition - The condition descriptor (field, operator, optional value).
 * @param watchedValue - The current value of the watched field retrieved from
 *   the form store.
 * @returns `true` when the condition passes, `false` otherwise.
 */
export function evaluateCondition(condition: Condition, watchedValue: unknown): boolean {
  const { operator, value } = condition;

  switch (operator) {
    case 'equals':
      return watchedValue === value;

    case 'not-equals':
      return watchedValue !== value;

    case 'contains':
      if (typeof watchedValue === 'string' && typeof value === 'string') {
        return watchedValue.includes(value);
      }
      if (Array.isArray(watchedValue)) {
        return (watchedValue as unknown[]).includes(value);
      }
      return false;

    case 'greater-than':
      return typeof watchedValue === 'number' && typeof value === 'number' && watchedValue > value;

    case 'less-than':
      return typeof watchedValue === 'number' && typeof value === 'number' && watchedValue < value;

    case 'truthy':
      return Boolean(watchedValue);

    case 'falsy':
      return !watchedValue;

    case 'in':
      return Array.isArray(value) && (value as unknown[]).includes(watchedValue);

    case 'not-in':
      return Array.isArray(value) && !(value as unknown[]).includes(watchedValue);

    default:
      return false;
  }
}

/**
 * Evaluates an array of {@link Condition|Conditions} against a map of watched
 * field values, combining the results with the specified boolean logic.
 *
 * An empty `conditions` array always returns `false` regardless of `logic` —
 * a group with no rules is treated as permanently hidden.
 *
 * @param conditions - Array of conditions to evaluate. Empty array returns `false`.
 * @param logic - `'AND'` requires every condition to pass; `'OR'` requires at
 *   least one condition to pass.
 * @param watchedValues - Map of field name → current value, keyed by
 *   `Condition.field`.
 * @returns `true` when the combined evaluation passes, `false` otherwise.
 */
export function evaluateAll(
  conditions: Condition[],
  logic: 'AND' | 'OR',
  watchedValues: Record<string, unknown>,
): boolean {
  if (conditions.length === 0) return false;
  if (logic === 'OR') {
    return conditions.some((c) => evaluateCondition(c, watchedValues[c.field]));
  }
  return conditions.every((c) => evaluateCondition(c, watchedValues[c.field]));
}

/**
 * Core logic hook for {@link ConditionalField}.
 *
 * Subscribes to the relevant field values in the TanStack Form store and
 * derives `isVisible`. Calls `form.resetField` for every name in `fieldNames`
 * when the group transitions from visible → hidden and `unregisterOnHide` is
 * `true`.
 *
 * @remarks
 * The hook uses `useSyncExternalStore` with a JSON-serialised snapshot selector
 * so that only re-renders triggered by changes to the *watched* fields are
 * propagated. Unrelated form mutations do not cause this hook to recompute.
 *
 * `undefined` field values are normalised to `null` during serialisation so
 * that fields that have never been set behave the same as explicitly null ones.
 *
 * @typeParam TFormData - Shape of the form's value object.
 * @param options - Configuration options — see {@link UseConditionalFieldOptions}.
 * @returns An object with a single boolean `isVisible` property.
 */
export function useConditionalField<TFormData extends Record<string, unknown>>({
  form,
  conditions,
  logic = 'AND',
  unregisterOnHide = true,
  fieldNames = [],
}: UseConditionalFieldOptions<TFormData>): { isVisible: boolean } {
  const conditionsArray = useMemo(
    () => (Array.isArray(conditions) ? conditions : [conditions]),
    [conditions],
  );

  const uniqueFieldNames = useMemo(
    () => [...new Set(conditionsArray.map((c) => c.field))],
    [conditionsArray],
  );

  /**
   * Stable subscribe callback for `useSyncExternalStore`. Only re-created if
   * `form.store` changes (it does not in practice — TanStack Form creates the
   * store once via `useState`).
   */
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const subscription = form.store.subscribe(onStoreChange);
      return () => subscription.unsubscribe();
    },
    [form.store],
  );

  /**
   * Snapshot selector: serialises only the watched fields to a JSON string.
   * Because `useSyncExternalStore` uses `Object.is` equality on the snapshot,
   * returning a primitive string means re-renders are suppressed when unrelated
   * parts of the form change.
   *
   * `undefined` values are normalised to `null` via the `?? null` coalesce so
   * that fields that have never been set behave the same as explicitly null ones.
   */
  const getSnapshot = useCallback((): string => {
    const values = form.store.get().values as Record<string, unknown>;
    const relevant: Record<string, unknown> = {};
    for (const name of uniqueFieldNames) {
      relevant[name] = getIn(values, name) ?? null;
    }
    return JSON.stringify(relevant);
  }, [form.store, uniqueFieldNames]);

  const watchedJson = useSyncExternalStore(subscribe, getSnapshot);

  const isVisible = useMemo(
    () => evaluateAll(conditionsArray, logic, JSON.parse(watchedJson) as Record<string, unknown>),
    [conditionsArray, logic, watchedJson],
  );

  const prevIsVisibleRef = useRef(isVisible);

  useEffect(() => {
    const wasVisible = prevIsVisibleRef.current;
    prevIsVisibleRef.current = isVisible;

    if (wasVisible && !isVisible && unregisterOnHide && fieldNames.length > 0) {
      for (const name of fieldNames) {
        form.resetField(name);
      }
    }
  }, [isVisible, unregisterOnHide, fieldNames, form]);

  return { isVisible };
}

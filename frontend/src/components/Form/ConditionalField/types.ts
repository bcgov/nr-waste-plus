import type { DeepKeys } from '@tanstack/react-form';
import type { ReactNode } from 'react';

/**
 * The minimum shape of a TanStack Form instance required by `ConditionalField`.
 *
 * A structural interface is used instead of `ReturnType<typeof useForm<TFormData>>`
 * for two reasons:
 *
 * 1. TypeScript cannot check `ReturnType<T>`'s callable constraint when `T` is an
 *    instantiation expression (`typeof useForm<TFormData>`) with a free type
 *    parameter — it resolves to `never`.
 * 2. `FormApi`'s validator type parameters are marked `in out` (invariant), so no
 *    concrete union type (including `undefined`, `unknown`, or `never`) is
 *    assignable across all possible form configurations.
 *
 * The actual `useForm()` return type (`ReactFormExtendedApi<TFormData, …>`) is a
 * structural superset of this interface — no explicit cast is ever needed at call
 * sites.
 *
 * @typeParam TFormData - Shape of the form's value object.
 */
export interface FormInstance<TFormData extends Record<string, unknown>> {
  /**
   * The reactive store backing the form.
   *
   * `ConditionalField` subscribes via React's `useSyncExternalStore` using only
   * the `get` and `subscribe` members — the standard external-store protocol
   * expected by React 18+.
   */
  readonly store: {
    /** Returns the current form state snapshot. */
    get(): { readonly values: TFormData };
    /**
     * Registers a change listener. Compatible with `useSyncExternalStore`'s
     * subscribe contract after unwrapping the returned `unsubscribe` method.
     */
    subscribe(fn: () => void): { unsubscribe: () => void };
  };
  /**
   * Resets the named field to its configured default value.
   * Called by `useConditionalField` when `unregisterOnHide` is `true`.
   */
  resetField(fieldName: DeepKeys<TFormData>): void;
}

/**
 * All comparison operators supported by {@link Condition}.
 *
 * | Operator | Semantics |
 * |---|---|
 * | `equals` | Strict equality (`===`) |
 * | `not-equals` | Strict inequality (`!==`) |
 * | `contains` | `String.includes` or `Array.includes` |
 * | `greater-than` | Numeric `>` |
 * | `less-than` | Numeric `<` |
 * | `truthy` | Boolean coercion — `Boolean(value)` |
 * | `falsy` | Inverse boolean coercion — `!value` |
 * | `in` | Watched value is inside the `value` array |
 * | `not-in` | Watched value is not inside the `value` array |
 */
export type ConditionOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'greater-than'
  | 'less-than'
  | 'truthy'
  | 'falsy'
  | 'in'
  | 'not-in';

/**
 * A single predicate that tests one form field against an expected value.
 *
 * Multiple conditions can be composed with `AND`/`OR` logic inside
 * {@link ConditionalFieldProps.logic}.
 */
export interface Condition {
  /** Name of the form field to observe. Must match a key in `TFormData`. */
  readonly field: string;
  /** The comparison operator to apply. */
  readonly operator: ConditionOperator;
  /** Required for all operators except `truthy` and `falsy`. For `in`/`not-in`, must be an array. */
  readonly value?: unknown;
}

/**
 * Props for the {@link ConditionalField} component.
 *
 * @typeParam TFormData - Shape of the form's value object. Inferred from the
 *   `form` prop when used with `useForm`.
 */
export interface ConditionalFieldProps<TFormData extends Record<string, unknown>> {
  /** The TanStack Form instance returned by `useForm`. */
  readonly form: FormInstance<TFormData>;
  /** One condition or an array of conditions that control visibility. */
  readonly conditions: Condition | Condition[];
  /**
   * How multiple conditions are combined.
   * @default 'AND'
   */
  readonly logic?: 'AND' | 'OR';
  readonly children: ReactNode;
  /**
   * When `true`, children stay mounted but are visually hidden.
   * Keeps field state alive in TanStack Form.
   * @default false
   */
  readonly keepMounted?: boolean;
  /**
   * Applies a CSS height + opacity transition when the field becomes visible.
   * @default true
   */
  readonly animateIn?: boolean;
  /**
   * When `true` and `fieldNames` is provided, calls `form.resetField` for each
   * listed field name when the group becomes hidden.
   * @default true
   */
  readonly unregisterOnHide?: boolean;
  /**
   * Field names belonging to this conditional group. When `unregisterOnHide` is
   * `true`, these fields are reset to their default values on hide.
   * Values must be valid `DeepKeys` of the form's data shape.
   */
  readonly fieldNames?: Array<DeepKeys<TFormData>>;
}

/**
 * Options for the {@link useConditionalField} hook.
 *
 * A subset of {@link ConditionalFieldProps} — the visual-only props
 * (`children`, `keepMounted`, `animateIn`) are omitted because the hook only
 * manages visibility logic and field reset side-effects.
 *
 * @typeParam TFormData - Shape of the form's value object.
 */
export interface UseConditionalFieldOptions<TFormData extends Record<string, unknown>> {
  /** The TanStack Form instance returned by `useForm`. */
  readonly form: FormInstance<TFormData>;
  /** One condition or an array of conditions that control visibility. */
  readonly conditions: Condition | Condition[];
  /**
   * How multiple conditions are combined.
   * @default 'AND'
   */
  readonly logic?: 'AND' | 'OR';
  /**
   * When `true`, calls `form.resetField` for each name in `fieldNames` on hide.
   * @default true
   */
  readonly unregisterOnHide?: boolean;
  /**
   * Field names belonging to this conditional group. When `unregisterOnHide` is
   * `true`, these fields are reset to their default values on hide.
   * Values must be valid `DeepKeys` of the form's data shape.
   */
  readonly fieldNames?: Array<DeepKeys<TFormData>>;
}

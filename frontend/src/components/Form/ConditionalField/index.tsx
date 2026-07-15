import React, { memo } from 'react';

import { useConditionalField } from './useConditionalField';

import type { ConditionalFieldProps } from './types';

import './index.scss';

/** Internal implementation. Wrapped with `memo` and re-exported as {@link ConditionalField}. */
const ConditionalFieldInner = <TFormData extends Record<string, unknown>>({
  form,
  conditions,
  logic = 'AND',
  children,
  keepMounted = false,
  animateIn = true,
  unregisterOnHide = true,
  fieldNames = [],
}: ConditionalFieldProps<TFormData>): React.ReactElement | null => {
  const { isVisible } = useConditionalField({
    form,
    conditions,
    logic,
    unregisterOnHide,
    fieldNames,
  });

  if (keepMounted) {
    const classNames = [
      'conditional-field',
      animateIn ? 'conditional-field--animate' : '',
      isVisible ? '' : 'conditional-field--hidden',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        className={classNames}
        aria-hidden={!isVisible || undefined}
        data-testid="conditional-field"
      >
        {children}
      </div>
    );
  }

  if (!isVisible) {
    return null;
  }

  const classNames = ['conditional-field', animateIn ? 'conditional-field--animate' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} data-testid="conditional-field">
      {children}
    </div>
  );
};

/**
 * Declaratively shows or hides — and optionally resets — a field or group of
 * fields based on the value of another form field.
 *
 * @component
 * @example
 * ```tsx
 * <ConditionalField
 *   form={form}
 *   conditions={{ field: 'hasDistrict', operator: 'truthy' }}
 *   fieldNames={['districtCode']}
 * >
 *   <form.Field name="districtCode">{(f) => <ComboBox ... />}</form.Field>
 * </ConditionalField>
 * ```
 *
 * @param props - Component props.
 * @param props.form - The TanStack Form instance returned by `useForm`.
 * @param props.conditions - One condition or array of conditions controlling visibility.
 * @param props.logic - How multiple conditions are combined. Defaults to `'AND'`.
 * @param props.children - Content to show or hide.
 * @param props.keepMounted - When `true`, children remain in DOM but are visually hidden.
 * @param props.animateIn - When `true`, applies a height + opacity transition on show.
 * @param props.unregisterOnHide - When `true`, resets `fieldNames` fields on hide.
 * @param props.fieldNames - Field names to reset when the group becomes hidden.
 * @returns The conditional wrapper element, or `null` when hidden and not mounted.
 */
export const ConditionalField = memo(ConditionalFieldInner) as <
  TFormData extends Record<string, unknown>,
>(
  props: ConditionalFieldProps<TFormData>,
) => React.ReactElement | null;

export default ConditionalField;

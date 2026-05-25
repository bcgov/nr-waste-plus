import { useForm } from '@tanstack/react-form';
import { act, render, screen } from '@testing-library/react';
import { useEffect, type FC } from 'react';
import { describe, expect, it, type MockInstance, vi } from 'vitest';

import { evaluateAll, evaluateCondition, getIn } from './useConditionalField';

import ConditionalField from './index';

import type { Condition, FormInstance } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SimpleFormData = {
  status: string | null;
  clientNumber: string | null;
  extra: string | null;
  count: number | null;
  tags: string[] | null;
};

const defaultValues: SimpleFormData = {
  status: null,
  clientNumber: null,
  extra: null,
  count: null,
  tags: null,
};

/** Test-local form handle: `FormInstance` surface plus `setFieldValue` for imperative mutations. */
type TestForm = FormInstance<SimpleFormData> & {
  setFieldValue(field: keyof SimpleFormData, updater: SimpleFormData[keyof SimpleFormData]): void;
};

/**
 * Mounts a `ConditionalField` inside a real TanStack Form and exposes the form
 * instance via a callback so tests can call `setFieldValue` imperatively.
 */
function renderWithForm({
  conditions,
  logic,
  keepMounted,
  animateIn,
  unregisterOnHide,
  fieldNames,
  childText = 'Conditional Content',
  onFormReady,
}: {
  conditions: Condition | Condition[];
  logic?: 'AND' | 'OR';
  keepMounted?: boolean;
  animateIn?: boolean;
  unregisterOnHide?: boolean;
  fieldNames?: Array<keyof SimpleFormData>;
  childText?: string;
  onFormReady?: (form: TestForm) => void;
}) {
  const Wrapper: FC = () => {
    const form = useForm({ defaultValues });

    useEffect(() => {
      onFormReady?.(form);
    });

    return (
      <ConditionalField
        form={form}
        conditions={conditions}
        logic={logic}
        keepMounted={keepMounted}
        animateIn={animateIn}
        unregisterOnHide={unregisterOnHide}
        fieldNames={fieldNames}
      >
        <span>{childText}</span>
      </ConditionalField>
    );
  };

  return render(<Wrapper />);
}

// ---------------------------------------------------------------------------
// Pure function unit tests (no React needed)
// ---------------------------------------------------------------------------

describe('evaluateCondition', () => {
  it('equals — matches strictly', () => {
    expect(evaluateCondition({ field: 'f', operator: 'equals', value: 'active' }, 'active')).toBe(
      true,
    );
    expect(evaluateCondition({ field: 'f', operator: 'equals', value: 'active' }, 'ACTIVE')).toBe(
      false,
    );
  });

  it('not-equals — returns true for different values', () => {
    expect(evaluateCondition({ field: 'f', operator: 'not-equals', value: 'x' }, 'y')).toBe(true);
    expect(evaluateCondition({ field: 'f', operator: 'not-equals', value: 'x' }, 'x')).toBe(false);
  });

  it('contains — works for strings', () => {
    expect(evaluateCondition({ field: 'f', operator: 'contains', value: 'foo' }, 'foobar')).toBe(
      true,
    );
    expect(evaluateCondition({ field: 'f', operator: 'contains', value: 'baz' }, 'foobar')).toBe(
      false,
    );
  });

  it('contains — works for arrays', () => {
    expect(evaluateCondition({ field: 'f', operator: 'contains', value: 'b' }, ['a', 'b'])).toBe(
      true,
    );
  });

  it('greater-than / less-than', () => {
    expect(evaluateCondition({ field: 'f', operator: 'greater-than', value: 5 }, 10)).toBe(true);
    expect(evaluateCondition({ field: 'f', operator: 'less-than', value: 5 }, 3)).toBe(true);
    expect(evaluateCondition({ field: 'f', operator: 'greater-than', value: 5 }, 3)).toBe(false);
  });

  it('truthy / falsy', () => {
    expect(evaluateCondition({ field: 'f', operator: 'truthy' }, 'hello')).toBe(true);
    expect(evaluateCondition({ field: 'f', operator: 'truthy' }, '')).toBe(false);
    expect(evaluateCondition({ field: 'f', operator: 'falsy' }, null)).toBe(true);
    expect(evaluateCondition({ field: 'f', operator: 'falsy' }, 'x')).toBe(false);
  });

  it('in / not-in', () => {
    expect(evaluateCondition({ field: 'f', operator: 'in', value: ['a', 'b', 'c'] }, 'b')).toBe(
      true,
    );
    expect(evaluateCondition({ field: 'f', operator: 'in', value: ['a', 'b', 'c'] }, 'z')).toBe(
      false,
    );
    expect(evaluateCondition({ field: 'f', operator: 'not-in', value: ['a', 'b'] }, 'c')).toBe(
      true,
    );
    // watchedValue IS in the excluded list → false
    expect(evaluateCondition({ field: 'f', operator: 'not-in', value: ['a', 'b'] }, 'a')).toBe(
      false,
    );
    // value is not an array → short-circuit false
    expect(evaluateCondition({ field: 'f', operator: 'not-in', value: 'not-array' }, 'a')).toBe(
      false,
    );
  });

  it('contains — returns false for non-string non-array value', () => {
    expect(evaluateCondition({ field: 'f', operator: 'contains', value: 'x' }, 42)).toBe(false);
  });

  it('unknown operator — returns false via default case', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(evaluateCondition({ field: 'f', operator: 'unknown-op' as any }, 'x')).toBe(false);
  });
});

describe('evaluateAll', () => {
  const cA: Condition = { field: 'a', operator: 'truthy' };
  const cB: Condition = { field: 'b', operator: 'truthy' };

  it('empty array — always returns false regardless of logic', () => {
    expect(evaluateAll([], 'AND', {})).toBe(false);
    expect(evaluateAll([], 'OR', {})).toBe(false);
  });

  it('AND — true only when every condition passes', () => {
    expect(evaluateAll([cA, cB], 'AND', { a: 'yes', b: 'yes' })).toBe(true);
    expect(evaluateAll([cA, cB], 'AND', { a: 'yes', b: '' })).toBe(false);
  });

  it('OR — true when any condition passes', () => {
    expect(evaluateAll([cA, cB], 'OR', { a: 'yes', b: '' })).toBe(true);
    expect(evaluateAll([cA, cB], 'OR', { a: '', b: '' })).toBe(false);
  });
});

describe('getIn', () => {
  it('resolves a top-level key', () => {
    expect(getIn({ status: 'active' }, 'status')).toBe('active');
  });

  it('resolves a dot-separated nested path', () => {
    expect(getIn({ address: { city: 'Vancouver' } }, 'address.city')).toBe('Vancouver');
  });

  it('resolves deeply nested paths', () => {
    expect(getIn({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined for a missing key', () => {
    expect(getIn({ a: { b: 1 } }, 'a.c')).toBeUndefined();
  });

  it('returns undefined when an intermediate segment is null', () => {
    expect(getIn({ a: null }, 'a.b')).toBeUndefined();
  });

  it('returns undefined when an intermediate segment is a primitive', () => {
    expect(getIn({ a: 42 }, 'a.b')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Component integration tests
// ---------------------------------------------------------------------------

describe('ConditionalField — equals', () => {
  it('shows children when value matches, hides otherwise', async () => {
    let formRef!: TestForm;

    renderWithForm({
      conditions: { field: 'status', operator: 'equals', value: 'active' },
      onFormReady: (f) => {
        formRef = f;
      },
    });

    // Initially hidden (status is null)
    expect(screen.queryByText('Conditional Content')).toBeNull();

    // Set matching value → should appear
    await act(async () => {
      formRef.setFieldValue('status', 'active');
    });
    expect(screen.getByText('Conditional Content')).toBeTruthy();

    // Set non-matching value → should disappear
    await act(async () => {
      formRef.setFieldValue('status', 'inactive');
    });
    expect(screen.queryByText('Conditional Content')).toBeNull();
  });
});

describe('ConditionalField — truthy', () => {
  it('shows for truthy watched value', async () => {
    let formRef!: TestForm;

    renderWithForm({
      conditions: { field: 'clientNumber', operator: 'truthy' },
      onFormReady: (f) => {
        formRef = f;
      },
    });

    expect(screen.queryByText('Conditional Content')).toBeNull();

    await act(async () => {
      formRef.setFieldValue('clientNumber', 'CLIENT-1');
    });
    expect(screen.getByText('Conditional Content')).toBeTruthy();
  });
});

describe('ConditionalField — AND logic', () => {
  it('shows only when all conditions pass', async () => {
    let formRef!: TestForm;

    renderWithForm({
      conditions: [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'clientNumber', operator: 'truthy' },
      ],
      logic: 'AND',
      onFormReady: (f) => {
        formRef = f;
      },
    });

    // Neither condition satisfied
    expect(screen.queryByText('Conditional Content')).toBeNull();

    // Only first satisfied
    await act(async () => {
      formRef.setFieldValue('status', 'active');
    });
    expect(screen.queryByText('Conditional Content')).toBeNull();

    // Both satisfied
    await act(async () => {
      formRef.setFieldValue('clientNumber', 'CLIENT-1');
    });
    expect(screen.getByText('Conditional Content')).toBeTruthy();
  });
});

describe('ConditionalField — OR logic', () => {
  it('shows when any condition passes', async () => {
    let formRef!: TestForm;

    renderWithForm({
      conditions: [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'clientNumber', operator: 'truthy' },
      ],
      logic: 'OR',
      onFormReady: (f) => {
        formRef = f;
      },
    });

    // Neither → hidden
    expect(screen.queryByText('Conditional Content')).toBeNull();

    // Only second satisfied → visible
    await act(async () => {
      formRef.setFieldValue('clientNumber', 'CLIENT-1');
    });
    expect(screen.getByText('Conditional Content')).toBeTruthy();
  });
});

describe('ConditionalField — unregisterOnHide', () => {
  it('calls form.resetField for each fieldName when the group becomes hidden', async () => {
    let formRef!: TestForm;

    renderWithForm({
      conditions: { field: 'status', operator: 'truthy' },
      unregisterOnHide: true,
      fieldNames: ['extra'],
      onFormReady: (f) => {
        formRef = f;
      },
    });

    // Make visible first
    await act(async () => {
      formRef.setFieldValue('status', 'active');
    });

    if (!formRef) throw new Error('form not initialized');
    const resetFieldSpy = vi.spyOn(formRef, 'resetField') as MockInstance;

    // Hide → should trigger reset
    await act(async () => {
      formRef.setFieldValue('status', null);
    });

    expect(resetFieldSpy).toHaveBeenCalledWith('extra');
    resetFieldSpy.mockRestore();
  });

  it('does not call resetField when unregisterOnHide is false', async () => {
    let formRef!: TestForm;

    renderWithForm({
      conditions: { field: 'status', operator: 'truthy' },
      unregisterOnHide: false,
      fieldNames: ['extra'],
      onFormReady: (f) => {
        formRef = f;
      },
    });

    await act(async () => {
      formRef.setFieldValue('status', 'active');
    });

    if (!formRef) throw new Error('form not initialized');
    const resetFieldSpy = vi.spyOn(formRef, 'resetField') as MockInstance;

    await act(async () => {
      formRef.setFieldValue('status', null);
    });

    expect(resetFieldSpy).not.toHaveBeenCalled();
    resetFieldSpy.mockRestore();
  });
});

describe('ConditionalField — keepMounted', () => {
  it('keeps children in the DOM when hidden', async () => {
    let formRef!: TestForm;

    renderWithForm({
      conditions: { field: 'status', operator: 'truthy' },
      keepMounted: true,
      onFormReady: (f) => {
        formRef = f;
      },
    });

    // Children are in the DOM even when condition is false
    expect(screen.getByText('Conditional Content')).toBeTruthy();

    // Wrapper should carry aria-hidden when condition is false
    const wrapper = screen.getByText('Conditional Content').closest('.conditional-field');
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');

    // Make visible
    await act(async () => {
      formRef.setFieldValue('status', 'active');
    });

    // Children still in DOM, aria-hidden removed
    expect(screen.getByText('Conditional Content')).toBeTruthy();
    expect(wrapper?.getAttribute('aria-hidden')).toBeNull();
  });
});

describe('ConditionalField — animateIn false', () => {
  it('omits the animate class when `animateIn` is false and visible', async () => {
    let formRef!: TestForm;

    renderWithForm({
      conditions: { field: 'status', operator: 'truthy' },
      animateIn: false,
      onFormReady: (f) => {
        formRef = f;
      },
    });

    // Make visible
    await act(async () => {
      formRef.setFieldValue('status', 'active');
    });

    const wrapper = screen.getByText('Conditional Content').closest('.conditional-field');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.className).not.toContain('conditional-field--animate');
  });

  it('omits the animate class when `animateIn` is false and keepMounted is true (hidden)', async () => {
    let formRef!: TestForm;

    renderWithForm({
      conditions: { field: 'status', operator: 'truthy' },
      animateIn: false,
      keepMounted: true,
      onFormReady: (f) => {
        formRef = f;
      },
    });

    // Initially hidden but present in DOM
    const wrapper = screen.getByText('Conditional Content').closest('.conditional-field');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.className).toContain('conditional-field--hidden');
    expect(wrapper?.className).not.toContain('conditional-field--animate');

    // Make visible and ensure animate class still not present
    await act(async () => {
      formRef.setFieldValue('status', 'active');
    });

    expect(wrapper?.className).not.toContain('conditional-field--animate');
  });
});

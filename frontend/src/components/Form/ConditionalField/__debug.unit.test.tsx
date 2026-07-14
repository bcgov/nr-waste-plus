import { FormProvider, useForm } from '@tanstack/react-form';
import { render, screen } from '@testing-library/react';
import { describe, it, vi, beforeEach } from 'vitest';

import { useConditionalField } from './useConditionalField';

import ConditionalField from './index';

vi.mock('./useConditionalField', () => ({ useConditionalField: vi.fn() }));

describe('cf-debug', () => {
  beforeEach(() => {
    vi.mocked(useConditionalField).mockReturnValue({ isVisible: true } as any);
  });
  it('dumps', () => {
    const Test = () => {
      const form = useForm({ defaultValues: {} as any });
      return (
        <FormProvider form={form as any}>
          <ConditionalField form={form as any} conditions={{}} keepMounted>
            <span>x</span>
          </ConditionalField>
        </FormProvider>
      );
    };
    const { container } = render(<Test />);
    console.log('CF_HTML_START');
    console.log(container.innerHTML.slice(0, 300));
    console.log('CF_HTML_END');
  });
});

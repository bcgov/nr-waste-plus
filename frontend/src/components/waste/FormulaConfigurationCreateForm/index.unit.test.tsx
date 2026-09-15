import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks/useFormulaConfiguration', () => ({
  useCreateFormulaSet: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCurrentOpenEndedFormulaSet: () => ({
    data: undefined,
    isError: false,
    isFetched: true,
    error: null,
  }),
  useFormulaVariables: () => ({ data: { flat: {}, catalog: [] } }),
}));

vi.mock('./FormulaSection', () => ({
  default: () => <div data-testid="formula-section" />,
}));

vi.mock('../FormulaVariableCatalog', () => ({
  default: () => <div data-testid="formula-variable-catalog" />,
}));

import FormulaConfigurationCreateForm from './index';

describe('FormulaConfigurationCreateForm', () => {
  it('renders the create form with keyboard-submit support', () => {
    render(<FormulaConfigurationCreateForm />);

    expect(screen.getByTestId('formula-config-create-form')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review formulas' })).toBeTruthy();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/config/api/types';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  mutateAsync: vi.fn(),
  current: {
    data: undefined,
    isError: false,
    isFetched: true,
    error: null as unknown,
  },
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/hooks/useFormulaConfiguration', () => ({
  useCreateFormulaSet: () => ({ isPending: false, mutateAsync: mocks.mutateAsync }),
  useCurrentOpenEndedFormulaSet: () => mocks.current,
  useFormulaVariables: () => ({ data: { flat: {}, catalog: [] } }),
}));

vi.mock('./FormulaSection', () => ({
  default: ({ onChange }: { onChange: (key: string, expression: string) => void }) => (
    <div data-testid="formula-section">
      <button type="button" onClick={() => onChange('block.waste.avoidable_sawlog', '2')}>
        Edit formula
      </button>
    </div>
  ),
}));

vi.mock('../FormulaVariableCatalog', () => ({
  default: () => <div data-testid="formula-variable-catalog" />,
}));

import FormulaConfigurationCreateForm from './index';

describe('FormulaConfigurationCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.current.data = undefined;
    mocks.current.isError = false;
    mocks.current.isFetched = true;
    mocks.current.error = null;
  });

  it('renders the create form with keyboard-submit support', () => {
    render(<FormulaConfigurationCreateForm />);

    expect(screen.getByTestId('formula-config-create-form')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review formulas' })).toBeTruthy();
  });

  it('keeps review disabled until the current-set query is fetched', () => {
    mocks.current.isFetched = false;
    render(<FormulaConfigurationCreateForm />);

    expect(screen.getByRole('button', { name: 'Review formulas' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('does not show an error alert for a missing current formula set', () => {
    mocks.current.isError = true;
    mocks.current.error = new ApiError(
      {
        method: 'GET',
        url: '/formula-sets/current',
        mediaType: 'application/json',
        headers: {},
        query: undefined,
        body: undefined,
      },
      { url: '/formula-sets/current', ok: false, status: 404, statusText: 'Not Found', body: null },
      'Not found',
    );
    render(<FormulaConfigurationCreateForm />);

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows an alert for a current formula-set load failure', () => {
    mocks.current.isError = true;
    mocks.current.error = new Error('Service unavailable');
    render(<FormulaConfigurationCreateForm />);

    expect(screen.getByRole('alert').textContent).toContain(
      'current formula set could not be loaded',
    );
  });
});

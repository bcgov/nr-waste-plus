import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FormulaVariableCatalog from './index.tsx';

import type { FormulaNamespaceCatalog } from '@/services/formulaConfiguration.types.ts';

const catalog: FormulaNamespaceCatalog[] = [
  {
    prefix: 'da',
    label: 'District average',
    description: 'District average volumes.',
    availability: 'RUNTIME',
    variables: [
      {
        path: 'da.mature.avoidableGradeY',
        label: 'Avoidable Grade Y',
        value: 10,
      },
    ],
  },
  {
    prefix: 'submission',
    label: 'Submission values',
    description: 'Values provided during submission.',
    availability: 'SUBMISSION',
    variables: [],
  },
];

describe('FormulaVariableCatalog', () => {
  it('shows runtime values and submission-provided namespaces in the modal', async () => {
    render(<FormulaVariableCatalog catalog={catalog} />);

    await userEvent.click(screen.getByRole('button', { name: 'View formula variables' }));

    expect(screen.getByRole('heading', { name: 'Formula variables' })).toBeTruthy();
    expect(screen.getByText('da.*')).toBeTruthy();
    expect(screen.getByText('da.mature.avoidableGradeY')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('submission.*')).toBeTruthy();
    expect(screen.getByText('Provided during submission')).toBeTruthy();
  });

  it('filters variables while retaining the matching namespace', async () => {
    const user = userEvent.setup();
    render(<FormulaVariableCatalog catalog={catalog} />);

    await user.click(screen.getByRole('button', { name: 'View formula variables' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search formula variables' }), 'grade');

    expect(screen.getByText('da.*')).toBeTruthy();
    expect(screen.getByText('da.mature.avoidableGradeY')).toBeTruthy();
    expect(screen.queryByText('submission.*')).toBeNull();
  });
});

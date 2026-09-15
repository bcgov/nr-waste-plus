import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';

import FormulaConfigurationCreateForm from './index';

describe('FormulaConfigurationCreateForm', () => {
  it('renders the placeholder message', () => {
    render(<FormulaConfigurationCreateForm />);
    screen.getByText('Create form placeholder — implemented in Branch 5.');
  });
});

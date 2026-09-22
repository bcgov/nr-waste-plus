import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import FormulaConfigurationDetailSkeleton from './FormulaConfigurationDetailSkeleton';

describe('FormulaConfigurationDetailSkeleton', () => {
  it('renders Carbon skeleton text placeholders', () => {
    const { container } = render(<FormulaConfigurationDetailSkeleton />);
    const skeletons = container.querySelectorAll('.cds--skeleton__text');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });
});

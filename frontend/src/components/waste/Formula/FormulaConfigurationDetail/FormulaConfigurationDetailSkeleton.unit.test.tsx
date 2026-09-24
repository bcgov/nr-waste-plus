/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   Skeleton/class assertions below target CSS wiring, which has no semantic-query equivalent. */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import FormulaConfigurationDetailSkeleton from './FormulaConfigurationDetailSkeleton.tsx';

describe('FormulaConfigurationDetailSkeleton', () => {
  it('renders Carbon skeleton text placeholders', () => {
    const { container } = render(<FormulaConfigurationDetailSkeleton />);
    const skeletons = container.querySelectorAll('.cds--skeleton__text');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders formula-set-detail column classes', () => {
    const { container } = render(<FormulaConfigurationDetailSkeleton />);

    expect(container.querySelector('.formula-set-detail__start-date')).toBeTruthy();
    expect(container.querySelector('.formula-set-detail__end-date')).toBeTruthy();
    expect(container.querySelector('.district-volume-detail__start-date')).toBeNull();
    expect(container.querySelector('.district-volume-detail__end-date')).toBeNull();
  });
});

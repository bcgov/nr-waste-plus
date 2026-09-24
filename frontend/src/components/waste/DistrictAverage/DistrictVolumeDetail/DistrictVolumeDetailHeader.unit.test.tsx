/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   This suite asserts CSS class wiring (column renames), which has no semantic-query equivalent. */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DistrictVolumeDetailHeader from './DistrictVolumeDetailHeader.tsx';

describe('DistrictVolumeDetailHeader', () => {
  it('renders all four header fields with district-volume-detail column classes', () => {
    const { container } = render(
      <DistrictVolumeDetailHeader
        startDate="2026-06-01"
        endDate="2026-12-31"
        tableLevelFactor={0.5}
        heliMultiplier={1.25}
      />,
    );

    expect(container.querySelector('.district-volume-detail__start-date')).toBeTruthy();
    expect(container.querySelector('.district-volume-detail__end-date')).toBeTruthy();
    expect(container.querySelector('.district-volume-detail__table-level-factor')).toBeTruthy();
    expect(container.querySelector('.district-volume-detail__heli-multiplier')).toBeTruthy();
    expect(screen.getByTestId('card-item-content-end-date').textContent).toContain(
      'December 31, 2026',
    );
  });

  it('renders Open-ended when end date is null', () => {
    render(
      <DistrictVolumeDetailHeader startDate="2026-06-01" endDate={null} tableLevelFactor={0.5} />,
    );

    expect(screen.getByTestId('card-item-content-end-date').textContent).toBe('Open-ended');
  });

  it('renders TBD when heli multiplier is absent', () => {
    render(
      <DistrictVolumeDetailHeader startDate="2026-06-01" endDate={null} tableLevelFactor={0.5} />,
    );

    expect(screen.getByText('TBD')).toBeTruthy();
  });
});

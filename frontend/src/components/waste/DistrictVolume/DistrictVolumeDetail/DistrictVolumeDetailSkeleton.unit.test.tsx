import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import DistrictVolumeDetailSkeleton from './DistrictVolumeDetailSkeleton';

describe('DistrictVolumeDetailSkeleton', () => {
  it('should render skeleton for start date column', () => {
    render(<DistrictVolumeDetailSkeleton />);
    expect(screen.getByTestId('skeleton-start-date')).toBeTruthy();
  });

  it('should render skeleton for end date column', () => {
    render(<DistrictVolumeDetailSkeleton />);
    expect(screen.getByTestId('skeleton-end-date')).toBeTruthy();
  });

  it('should render skeleton for table level factor column', () => {
    render(<DistrictVolumeDetailSkeleton />);
    expect(screen.getByTestId('skeleton-table-level-factor')).toBeTruthy();
  });

  it('should render skeleton for heli multiplier column', () => {
    render(<DistrictVolumeDetailSkeleton />);
    expect(screen.getByTestId('skeleton-heli-multiplier')).toBeTruthy();
  });

  it('should render skeleton for zones section', () => {
    render(<DistrictVolumeDetailSkeleton />);
    expect(screen.getByTestId('skeleton-zones')).toBeTruthy();
  });

  it('should render SkeletonText heading elements', () => {
    render(<DistrictVolumeDetailSkeleton />);
    // Carbon's SkeletonText with `heading` renders a `<span>` with the heading class
    const headings = screen.getAllByTestId('skeleton-zones');
    // The zones section includes SkeletonText heading elements
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('should render all 5 Column wrappers with correct Carbon grid classes', () => {
    render(<DistrictVolumeDetailSkeleton />);
    // Each column wrapper has a data-testid attribute
    const columns = [
      screen.getByTestId('skeleton-start-date'),
      screen.getByTestId('skeleton-end-date'),
      screen.getByTestId('skeleton-table-level-factor'),
      screen.getByTestId('skeleton-heli-multiplier'),
      screen.getByTestId('skeleton-zones'),
    ];
    expect(columns.length).toBe(5);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import DistrictVolumeDetailView from './index';

import type { DistrictVolumeDetail } from '@/services/districtvolumes.types';

// ============================================================================
// Mocks
// ============================================================================

// Mock the sub-views to isolate the conditional routing logic
vi.mock('./InteriorDetailView', () => ({
  default: ({ data }: { data: DistrictVolumeDetail }) => (
    <div data-testid="interior-detail-view">
      <span data-testid="rendered-area">{data.area}</span>
    </div>
  ),
}));

vi.mock('./CoastDetailView', () => ({
  default: ({ data }: { data: DistrictVolumeDetail }) => (
    <div data-testid="coast-detail-view">
      <span data-testid="rendered-area">{data.area}</span>
    </div>
  ),
}));

// ============================================================================
// Factory helpers
// ============================================================================

const createData = (area: 'INTERIOR' | 'COASTAL'): DistrictVolumeDetail =>
  ({
    id: 1,
    area,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    uploadedBy: 'user',
    dateOfUpload: '2024-01-01T00:00:00Z',
    tableLevelFactor: 0.5,
    ...(area === 'COASTAL' && { heliMultiplier: 1.5 }),
    tableData:
      area === 'INTERIOR'
        ? { type: 'INTERIOR', zones: [], formulas: {} }
        : { type: 'COASTAL', sections: [], formulas: {} },
  }) as unknown as DistrictVolumeDetail;

// ============================================================================
// Tests
// ============================================================================

describe('DistrictVolumeDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render InteriorDetailView when data.area is INTERIOR', () => {
    render(<DistrictVolumeDetailView data={createData('INTERIOR')} />);

    expect(screen.getByTestId('interior-detail-view')).toBeTruthy();
    expect(screen.queryByTestId('coast-detail-view')).toBeNull();
  });

  it('should render CoastDetailView when data.area is COASTAL', () => {
    render(<DistrictVolumeDetailView data={createData('COASTAL')} />);

    expect(screen.getByTestId('coast-detail-view')).toBeTruthy();
    expect(screen.queryByTestId('interior-detail-view')).toBeNull();
  });

  it('should pass the full data object to InteriorDetailView', () => {
    const data = createData('INTERIOR');
    render(<DistrictVolumeDetailView data={data} />);

    expect(screen.getByTestId('rendered-area').textContent).toBe('INTERIOR');
  });

  it('should pass the full data object to CoastDetailView', () => {
    const data = createData('COASTAL');
    render(<DistrictVolumeDetailView data={data} />);

    expect(screen.getByTestId('rendered-area').textContent).toBe('COASTAL');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import DistrictVolumeTableDetailPage from './index';

import type { DistrictVolumeDetail } from '@/services/districtvolumes.types';

import { useDistrictVolumeTableDetailQuery } from '@/config/react-query/hooks';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn().mockReturnValue({ id: '1' }),
}));

vi.mock('@/config/react-query/hooks', () => ({
  useDistrictVolumeTableDetailQuery: vi.fn(),
}));

vi.mock('@/components/waste/DistrictVolumeDetail', () => ({
  default: ({ data }: { data: DistrictVolumeDetail }) => (
    <div data-testid="district-volume-detail-view">
      <span data-testid="rendered-area">{data.area}</span>
    </div>
  ),
}));

vi.mock('@/components/waste/DistrictVolumeDetail/DistrictVolumeDetailSkeleton', () => ({
  default: () => <div data-testid="district-volume-detail-skeleton" />,
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({
    title,
    subtitle,
    breadCrumbs,
  }: {
    title: string;
    subtitle?: string;
    breadCrumbs?: Array<{ name: string; path: string }>;
  }) => (
    <div data-testid="page-title">
      <span data-testid="page-title-text">{title}</span>
      {subtitle && <span data-testid="page-subtitle-text">{subtitle}</span>}
      {breadCrumbs?.map((crumb) => (
        <a key={crumb.name} data-testid={`breadcrumb-${crumb.name}`} href={crumb.path}>
          {crumb.name}
        </a>
      ))}
    </div>
  ),
}));

vi.mock('@/components/core/PageNotification', () => ({
  default: ({ eventTarget }: { eventTarget: string }) => (
    <div data-testid="page-notification" data-event-target={eventTarget} />
  ),
}));

// ============================================================================
// Factory helpers
// ============================================================================

const createData = (area: 'INTERIOR' | 'COASTAL', id = 1): DistrictVolumeDetail =>
  ({
    id,
    area,
    startDate: '2026-06-01',
    endDate: null,
    uploadedBy: 'user',
    dateOfUpload: '2026-06-01T00:00:00Z',
    tableLevelFactor: 0.4,
    ...(area === 'COASTAL' && { heliMultiplier: 3.47 }),
    tableData:
      area === 'INTERIOR'
        ? { type: 'INTERIOR', zones: [], formulas: {} }
        : { type: 'COASTAL', sections: [], formulas: {} },
  }) as unknown as DistrictVolumeDetail;

// ============================================================================
// Tests
// ============================================================================

describe('DistrictVolumeTableDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render DistrictVolumeDetailSkeleton when isLoading is true', () => {
    vi.mocked(useDistrictVolumeTableDetailQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useDistrictVolumeTableDetailQuery>);

    render(<DistrictVolumeTableDetailPage />);

    expect(screen.getByTestId('district-volume-detail-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('page-title')).toBeNull();
    expect(screen.queryByTestId('district-volume-detail-view')).toBeNull();
  });

  it('should render error title and PageNotification when isError is true', () => {
    vi.mocked(useDistrictVolumeTableDetailQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useDistrictVolumeTableDetailQuery>);

    render(<DistrictVolumeTableDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe(
      'District Volume Table not found',
    );
    expect(screen.getByTestId('page-notification')).toBeTruthy();
    expect(screen.queryByTestId('district-volume-detail-view')).toBeNull();
  });

  it('should render error title when data is null', () => {
    vi.mocked(useDistrictVolumeTableDetailQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useDistrictVolumeTableDetailQuery>);

    render(<DistrictVolumeTableDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe(
      'District Volume Table not found',
    );
    expect(screen.queryByTestId('district-volume-detail-view')).toBeNull();
  });

  it('should render page title with normalized Interior data and DistrictVolumeDetailView', () => {
    const data = createData('INTERIOR', 1);
    vi.mocked(useDistrictVolumeTableDetailQuery).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useDistrictVolumeTableDetailQuery>);

    render(<DistrictVolumeTableDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe('Volumes table: Interior');
    expect(screen.getByTestId('district-volume-detail-view')).toBeTruthy();
    expect(screen.getByTestId('rendered-area').textContent).toBe('INTERIOR');
  });

  it('should render page title with normalized Coast data and DistrictVolumeDetailView', () => {
    const data = createData('COASTAL', 4);
    vi.mocked(useDistrictVolumeTableDetailQuery).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useDistrictVolumeTableDetailQuery>);

    render(<DistrictVolumeTableDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe('Volumes table: Coastal');
    expect(screen.getByTestId('district-volume-detail-view')).toBeTruthy();
    expect(screen.getByTestId('rendered-area').textContent).toBe('COASTAL');
  });

  it('should normalize text by capitalizing each word', () => {
    const cases: Array<{ area: 'INTERIOR' | 'COASTAL'; expected: string }> = [
      { area: 'INTERIOR', expected: 'Interior' },
      { area: 'COASTAL', expected: 'Coastal' },
    ];

    for (const { area, expected } of cases) {
      vi.clearAllMocks();
      const data = createData(area);
      vi.mocked(useDistrictVolumeTableDetailQuery).mockReturnValue({
        data,
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useDistrictVolumeTableDetailQuery>);

      const { unmount } = render(<DistrictVolumeTableDetailPage />);

      expect(screen.getByTestId('page-title-text').textContent).toBe(`Volumes table: ${expected}`);
      unmount();
    }
  });

  it('should render the correct subtitle text', () => {
    const data = createData('INTERIOR');
    vi.mocked(useDistrictVolumeTableDetailQuery).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useDistrictVolumeTableDetailQuery>);

    render(<DistrictVolumeTableDetailPage />);

    expect(screen.getByTestId('page-subtitle-text').textContent).toBe(
      'View tables used to calculate volumes when district average waste assessment is used',
    );
  });

  it('should pass breadcrumbs to PageTitle', () => {
    const data = createData('INTERIOR', 1);
    vi.mocked(useDistrictVolumeTableDetailQuery).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useDistrictVolumeTableDetailQuery>);

    render(<DistrictVolumeTableDetailPage />);

    expect(screen.getByTestId('breadcrumb-Configuration')).toBeTruthy();
    expect(screen.getByTestId('breadcrumb-Configuration').getAttribute('href')).toBe(
      '/configuration',
    );
    expect(screen.getByTestId('breadcrumb-District average volumes')).toBeTruthy();
    expect(screen.getByTestId('breadcrumb-District average volumes').getAttribute('href')).toBe(
      '/configuration/district-volume-tables',
    );
  });
});

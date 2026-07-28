import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SpeciesCompositionDetailPage from './index';

import type { SpeciesCompositionDetail } from '@/services/speciesComposition.types';

import { useSpeciesCompositionDetailQuery } from '@/config/react-query/hooks';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn().mockReturnValue({ id: '42' }),
}));

vi.mock('@/config/react-query/hooks', () => ({
  useSpeciesCompositionDetailQuery: vi.fn(),
}));

vi.mock('@/components/waste/SpeciesCompositionDetailView', () => ({
  default: ({ data }: { data: SpeciesCompositionDetail }) => (
    <div data-testid="species-composition-detail-view">
      <span data-testid="rendered-id">{data.id}</span>
    </div>
  ),
}));

vi.mock('@/components/waste/SpeciesCompositionDetailView/SpeciesCompositionDetailSkeleton', () => ({
  default: () => <div data-testid="species-composition-detail-skeleton" />,
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

const createData = (id = 42): SpeciesCompositionDetail =>
  ({
    id,
    startDate: '2026-06-01',
    endDate: null,
    uploadedBy: 'jsmith@gov.bc.ca',
    dateOfUpload: '2026-05-15T14:23:00Z',
    tableData: {
      rows: [
        {
          district: { code: 'DCC', description: 'Cariboo-Chilcotin' },
          balsam: 0,
          cedar: 0,
          cottonwood: 5,
          cypress: 0,
          fir: 0,
          hemlock: 0,
          larch: 0,
          maple: 0,
          pine: 43,
          poplar: 0,
          redcedar: 0,
          redwood: 0,
          spruce: 52,
          whitebirch: 0,
          whitepine: 0,
          yew: 0,
          other: 0,
          unknown: 0,
          total: 100,
        },
      ],
    },
  }) as SpeciesCompositionDetail;

// ============================================================================
// Tests
// ============================================================================

describe('SpeciesCompositionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render SpeciesCompositionDetailSkeleton when isLoading is true', () => {
    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    render(<SpeciesCompositionDetailPage />);

    expect(screen.getByTestId('species-composition-detail-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('page-title')).toBeNull();
    expect(screen.queryByTestId('species-composition-detail-view')).toBeNull();
  });

  it('should render error title and PageNotification when isError is true', () => {
    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    render(<SpeciesCompositionDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe('Species composition not found');
    expect(screen.getByTestId('page-notification')).toBeTruthy();
    expect(screen.queryByTestId('species-composition-detail-view')).toBeNull();
  });

  it('should render error title when data is null', () => {
    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    render(<SpeciesCompositionDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe('Species composition not found');
    expect(screen.queryByTestId('species-composition-detail-view')).toBeNull();
  });

  it('should render page title with data and SpeciesCompositionDetailView', () => {
    const data = createData(42);
    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    render(<SpeciesCompositionDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe('Species composition table');
    expect(screen.getByTestId('species-composition-detail-view')).toBeTruthy();
    expect(screen.getByTestId('rendered-id').textContent).toBe('42');
  });

  it('should render the correct subtitle text', () => {
    const data = createData();
    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    render(<SpeciesCompositionDetailPage />);

    expect(screen.getByTestId('page-subtitle-text').textContent).toBe(
      'View species composition table details',
    );
  });

  it('should pass breadcrumbs to PageTitle', () => {
    const data = createData(42);
    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    render(<SpeciesCompositionDetailPage />);

    expect(screen.getByTestId('breadcrumb-Configuration')).toBeTruthy();
    expect(screen.getByTestId('breadcrumb-Configuration').getAttribute('href')).toBe(
      '/configuration',
    );
    expect(screen.getByTestId('breadcrumb-Species composition')).toBeTruthy();
    expect(screen.getByTestId('breadcrumb-Species composition').getAttribute('href')).toBe(
      '/configuration/species-composition',
    );
  });
});

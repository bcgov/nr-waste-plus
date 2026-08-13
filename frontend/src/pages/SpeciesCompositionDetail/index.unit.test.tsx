import { useNavigate, useParams } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SpeciesCompositionDetailPage from './index';

import type { SpeciesCompositionDetail } from '@/services/speciesComposition.types';

import { useSpeciesCompositionDetailQuery } from '@/config/react-query/hooks';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
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
    children,
  }: {
    title: string;
    subtitle?: string;
    breadCrumbs?: Array<{ name: string; path: string }>;
    children?: ReactNode;
  }) => (
    <div data-testid="page-title">
      <span data-testid="page-title-text">{title}</span>
      {subtitle && <span data-testid="page-subtitle-text">{subtitle}</span>}
      {breadCrumbs?.map((crumb) => (
        <a key={crumb.name} data-testid={`breadcrumb-${crumb.name}`} href={crumb.path}>
          {crumb.name}
        </a>
      ))}
      {children}
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
          species: {
            AL: 0,
            AR: 0,
            AS: 0,
            BA: 0,
            BI: 0,
            CE: 0,
            CO: 5,
            CY: 0,
            FI: 0,
            HE: 0,
            LA: 0,
            LO: 0,
            MA: 0,
            OT: 0,
            R: 0,
            SP: 43,
            UU: 0,
            WA: 0,
            WB: 0,
            WH: 0,
            WI: 0,
            YE: 0,
          },
        },
      ],
    },
  }) as SpeciesCompositionDetail;

// ============================================================================
// Tests
// ============================================================================

describe('SpeciesCompositionDetailPage', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
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

  it('should render a Back button that navigates to the species composition list', async () => {
    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data: createData(),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    const user = userEvent.setup();
    render(<SpeciesCompositionDetailPage />);

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/configuration/species-composition' });
  });

  it('passes the numeric id derived from route params to the query hook', () => {
    // The default useParams mock returns "42" (string).
    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    render(<SpeciesCompositionDetailPage />);

    expect(useSpeciesCompositionDetailQuery).toHaveBeenCalledWith(42, {
      notificationTarget: 'species-composition-detail',
    });
  });

  it('forwards NaN when the route id cannot be parsed as a number', () => {
    // Override the useParams mock for this test only.
    vi.mocked(useParams).mockReturnValue({ id: 'not-a-number' });

    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    render(<SpeciesCompositionDetailPage />);

    expect(useSpeciesCompositionDetailQuery).toHaveBeenCalledWith(NaN, {
      notificationTarget: 'species-composition-detail',
    });
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SpeciesCompositionDetailView from './index.tsx';

import type { SpeciesCompositionDetail } from '@/services/speciesComposition.types.ts';

// ============================================================================
// Mocks
// ============================================================================

vi.mock(
  '@/components/waste/SpeciesComposition/SpeciesCompositionDetailView/SpeciesCompositionDetailMatrix',
  () => ({
    default: ({ rows }: { rows: unknown[] }) => (
      <div data-testid="species-composition-matrix" data-rows-count={rows.length} />
    ),
  }),
);

vi.mock('@/components/core/PageNotification', () => ({
  default: ({ eventTarget }: { eventTarget: string }) => (
    <div data-testid="page-notification" data-event-target={eventTarget} />
  ),
}));

vi.mock('@/components/Form/ReadonlyInput', () => ({
  default: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div data-testid="readonly-input" data-label={label}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/core/Tags/DateTag', () => ({
  default: ({ date }: { date: string }) => <span data-testid="date-tag">{date}</span>,
}));

// ============================================================================
// Factory helpers
// ============================================================================

const createDetailData = (
  overrides?: Partial<SpeciesCompositionDetail>,
): SpeciesCompositionDetail =>
  ({
    id: 42,
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
            SP: 0,
            UU: 0,
            WB: 0,
            WH: 0,
            WI: 0,
            YE: 0,
          },
        },
      ],
    },
    ...overrides,
  }) as SpeciesCompositionDetail;

// ============================================================================
// Tests
// ============================================================================

describe('SpeciesCompositionDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render metadata header with all four fields', () => {
    const data = createDetailData();
    render(<SpeciesCompositionDetailView data={data} />);

    const inputs = screen.getAllByTestId('readonly-input');
    const labels = inputs.map((el) => el.getAttribute('data-label'));

    expect(labels).toEqual(['Start date', 'End date', 'Uploaded by', 'Date of upload']);
  });

  it('should render start date and date of upload as DateTags', () => {
    const data = createDetailData();
    render(<SpeciesCompositionDetailView data={data} />);

    const dateTags = screen.getAllByTestId('date-tag');
    expect(dateTags).toHaveLength(2);
    expect(dateTags[0].textContent).toBe('2026-06-01');
    expect(dateTags[1].textContent).toBe('2026-05-15T14:23:00Z');
  });

  it('should render Open-ended when end date is null', () => {
    const data = createDetailData({ endDate: null });
    render(<SpeciesCompositionDetailView data={data} />);

    expect(screen.getByText('Open-ended')).toBeTruthy();
  });

  it('should render end date as a DateTag when present', () => {
    const data = createDetailData({ endDate: '2026-12-31' });
    render(<SpeciesCompositionDetailView data={data} />);

    const dateTags = screen.getAllByTestId('date-tag');
    expect(dateTags).toHaveLength(3);
    expect(dateTags[1].textContent).toBe('2026-12-31');
  });

  it('should render PageNotification with correct eventTarget', () => {
    const data = createDetailData();
    render(<SpeciesCompositionDetailView data={data} />);

    const notification = screen.getByTestId('page-notification');
    expect(notification.getAttribute('data-event-target')).toBe('species-composition-detail');
  });

  it('should render matrix with row count', () => {
    const data = createDetailData();
    render(<SpeciesCompositionDetailView data={data} />);

    const matrix = screen.getByTestId('species-composition-matrix');
    expect(matrix.getAttribute('data-rows-count')).toBe('1');
  });

  it('should render an empty matrix when table data is malformed', () => {
    const data = createDetailData({
      tableData: null,
    } as unknown as Partial<SpeciesCompositionDetail>);

    render(<SpeciesCompositionDetailView data={data} />);

    expect(screen.getByTestId('species-composition-matrix').getAttribute('data-rows-count')).toBe(
      '0',
    );
  });
});

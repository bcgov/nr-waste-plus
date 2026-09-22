import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CoastDetailView from './CoastDetailView';

import type { DistrictVolumeDetail } from '@/services/districtvolumes.types';

/** Shared district options for testing the lookup in the coast district column. */
const SAMPLE_DISTRICT_OPTIONS = [
  { code: 'DCK', description: 'Chilliwack' },
  { code: 'DUN', description: 'Duncan' },
  { code: 'DKL', description: 'Dakota Knowles' },
];

// ============================================================================
// Mocks
// ============================================================================

// Mock child components to isolate CoastDetailView logic
vi.mock('@/components/Form/ReadonlyInput', () => ({
  default: ({ label, children }: { label: string; children?: React.ReactNode }) => (
    <div data-testid={`readonly-input-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span data-testid="readonly-label">{label}</span>
      <div data-testid="readonly-children">{children}</div>
    </div>
  ),
}));

vi.mock('@/components/core/Tags/DateTag', () => ({
  default: ({ date, format }: { date: string; format?: string }) => (
    <span data-testid="date-tag" data-date={date} data-format={format}>
      {date}
    </span>
  ),
}));

vi.mock('@/components/core/Tags/PrecisionNumberTag', () => ({
  default: ({ value, precision }: { value: number; precision?: number }) => (
    <span
      data-testid="precision-number-tag"
      data-value={String(value)}
      data-precision={String(precision)}
    >
      {String(value)}
    </span>
  ),
}));

vi.mock('@/components/waste/DistrictZoneSection', () => ({
  default: ({
    zoneName,
    rows,
    headers,
  }: {
    zoneName: string;
    rows: unknown[];
    headers: Array<{
      key: string;
      header: string;
      selected?: boolean;
      renderAs?: (value: unknown) => React.ReactNode;
    }>;
  }) => (
    <div data-testid="district-zone-section">
      <span data-testid="dzz-zone-name">{zoneName}</span>
      <span data-testid="dzz-rows-count">{String(rows.length)}</span>
      <span data-testid="dzz-headers-count">{String(headers.length)}</span>
      {/* Invoke renderAs callbacks to cover the arrow function bodies
          in the source components' headers arrays */}
      {headers.map((h) =>
        h.renderAs ? (
          <span key={String(h.key)} data-testid={`render-as-${String(h.key)}`}>
            {h.renderAs('1.23')}
          </span>
        ) : null,
      )}
    </div>
  ),
}));

// ============================================================================
// Factory helpers
// ============================================================================

const BASE_COAST_DATA = {
  id: 2,
  area: 'COASTAL' as const,
  startDate: '2024-06-01',
  endDate: '2024-12-31',
  uploadedBy: 'user',
  dateOfUpload: '2024-06-01T00:00:00Z',
  tableLevelFactor: 0.7,
  heliMultiplier: 1.5,
};

const createCoastData = (overrides?: Partial<Record<string, unknown>>): DistrictVolumeDetail =>
  ({
    ...BASE_COAST_DATA,
    tableData: {
      type: 'COASTAL' as const,
      sections: [
        {
          name: 'Mature',
          districts: [
            {
              code: 'DCK',
              avoidableSawlog: 16.19,
              avoidableHembalGradeU: 8.87,
              avoidableGradeY: 5.24,
              unavoidable: 1.18,
              total: 31.48,
            },
          ],
        },
        {
          name: 'Immature',
          districts: [
            {
              code: 'DUN',
              avoidableSawlog: 10.0,
              avoidableHembalGradeU: 5.0,
              avoidableGradeY: 2.5,
              unavoidable: 1.0,
              total: 18.5,
            },
          ],
        },
      ],
      formulas: {},
    },
    ...overrides,
  }) as unknown as DistrictVolumeDetail;

// ============================================================================
// Error boundary helper
// ============================================================================

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return <div data-testid="error-boundary-fallback" />;
    return this.props.children;
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('CoastDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('header fields', () => {
    it('should render start date with ReadonlyInput and DateTag', async () => {
      render(
        <CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={createCoastData()} />,
      );
      await waitFor(() => {});

      const startDateField = screen.getByTestId('readonly-input-start-date');
      expect(startDateField).toBeTruthy();
      expect(within(startDateField).getByTestId('readonly-label').textContent).toBe('Start date');
      expect(within(startDateField).getByTestId('date-tag').getAttribute('data-date')).toBe(
        '2024-06-01',
      );
      expect(within(startDateField).getByTestId('date-tag').getAttribute('data-format')).toBe(
        'MMMM dd, yyyy',
      );
    });

    it('should render end date with ReadonlyInput and DateTag', async () => {
      render(
        <CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={createCoastData()} />,
      );
      await waitFor(() => {});

      expect(screen.getByTestId('readonly-input-end-date')).toBeTruthy();
    });

    it('should render table level factor with ReadonlyInput and PrecisionNumberTag', async () => {
      render(
        <CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={createCoastData()} />,
      );
      await waitFor(() => {});

      const factorField = screen.getByTestId('readonly-input-dispersed-retention-reduction-factor');
      expect(factorField).toBeTruthy();

      const numberTag = within(factorField).getByTestId('precision-number-tag');
      expect(numberTag.getAttribute('data-value')).toBe('0.7');
      expect(numberTag.getAttribute('data-precision')).toBe('3');
    });

    it('should render heli multiplier with ReadonlyInput and PrecisionNumberTag', async () => {
      render(
        <CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={createCoastData()} />,
      );
      await waitFor(() => {});

      expect(screen.getByTestId('readonly-input-heli-multiplier')).toBeTruthy();
    });
  });

  describe('tabs and sections', () => {
    it('should render a tab for each section', async () => {
      render(
        <CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={createCoastData()} />,
      );
      await waitFor(() => {});

      expect(screen.getByRole('tab', { name: 'Mature' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Immature' })).toBeTruthy();
    });

    it('should render DistrictZoneSection for each section', async () => {
      render(
        <CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={createCoastData()} />,
      );
      await waitFor(() => {});

      expect(screen.getAllByTestId('district-zone-section').length).toBe(2);
    });

    it('should pass correct zone name and headers to DistrictZoneSection', async () => {
      render(
        <CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={createCoastData()} />,
      );
      await waitFor(() => {});

      const zoneNames = screen.getAllByTestId('dzz-zone-name');
      expect(zoneNames[0].textContent).toBe('Mature');
      expect(zoneNames[1].textContent).toBe('Immature');

      // 6 headers: code, avoidableSawlog, avoidableHembalGradeU,
      // avoidableGradeY, unavoidable, total — all selected
      const headersCounts = screen.getAllByTestId('dzz-headers-count');
      headersCounts.forEach((el) => {
        expect(el.textContent).toBe('6');
      });
    });

    it('should pass correct row count per section', async () => {
      render(
        <CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={createCoastData()} />,
      );
      await waitFor(() => {});

      const rowCounts = screen.getAllByTestId('dzz-rows-count');
      expect(rowCounts[0].textContent).toBe('1');
      expect(rowCounts[1].textContent).toBe('1');
    });

    it('should handle sections with multiple districts', async () => {
      const data = createCoastData();
      (
        data.tableData as {
          type: 'COASTAL';
          sections: { name: string; districts: Record<string, unknown>[] }[];
        }
      ).sections[0].districts.push({
        code: 'DKL',
        avoidableSawlog: 5.0,
        avoidableHembalGradeU: 2.5,
        avoidableGradeY: 1.25,
        unavoidable: 0.5,
        total: 9.25,
      });

      render(<CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={data} />);
      await waitFor(() => {});

      expect(screen.getAllByTestId('dzz-rows-count')[0].textContent).toBe('2');
    });
  });

  describe('edge cases', () => {
    it('should handle null endDate — not render DateTag for end date', async () => {
      const data = createCoastData({ endDate: null });
      render(<CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={data} />);
      await waitFor(() => {});

      // End date field children should be empty (no DateTag when endDate is null)
      const endDateField = screen.getByTestId('readonly-input-end-date');
      expect(within(endDateField).getByTestId('readonly-children').textContent).toBe('');
    });

    it('should render nothing for empty sections', async () => {
      const data = createCoastData({
        tableData: { type: 'COASTAL', sections: [], formulas: {} },
      });
      render(<CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={data} />);
      await waitFor(() => {});

      expect(screen.queryAllByTestId('district-zone-section').length).toBe(0);
      expect(screen.queryAllByRole('tab').length).toBe(0);
    });

    it('should skip DateTag when startDate is an empty string', async () => {
      const data = createCoastData({ startDate: '' });
      render(<CoastDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={data} />);
      await waitFor(() => {});

      // Only the end-date DateTag renders; start-date is empty string (falsy)
      const dateTags = screen.getAllByTestId('date-tag');
      expect(dateTags.length).toBe(1);
    });
  });

  describe('data validation', () => {
    it('should throw error when data.area is not COASTAL', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onError = vi.fn();

      render(
        <TestErrorBoundary onError={onError}>
          <CoastDetailView
            districtOptions={SAMPLE_DISTRICT_OPTIONS}
            data={
              {
                ...BASE_COAST_DATA,
                area: 'INTERIOR',
                tableData: { type: 'INTERIOR', zones: [], formulas: {} },
              } as unknown as DistrictVolumeDetail
            }
          />
        </TestErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'CoastDetailView requires data with area="COASTAL"',
        }),
      );
      consoleSpy.mockRestore();
    });
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import InteriorDetailView from './InteriorDetailView';

import type { DistrictVolumeDetail } from '@/services/districtvolumes.types';

/** Shared district options for testing the lookup in the district column. */
const SAMPLE_DISTRICT_OPTIONS = [
  { code: 'DCC', description: 'Cariboo-Chilcotin' },
  { code: 'DKL', description: 'Dakota Knowles' },
  { code: 'DTH', description: 'Thompson' },
  { code: 'DN1', description: 'District North 1' },
  { code: 'DN2', description: 'District North 2' },
];

// ============================================================================
// Mocks
// ============================================================================

// Mock child components to isolate InteriorDetailView logic
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

const BASE_INTERIOR_DATA = {
  id: 1,
  area: 'INTERIOR' as const,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  uploadedBy: 'user',
  dateOfUpload: '2024-01-01T00:00:00Z',
  tableLevelFactor: 0.5,
};

const createInteriorData = (overrides?: Partial<Record<string, unknown>>): DistrictVolumeDetail =>
  ({
    ...BASE_INTERIOR_DATA,
    tableData: {
      type: 'INTERIOR' as const,
      zones: [
        {
          name: 'Dry belt',
          districts: [
            {
              code: 'DCC',
              avoidableSawlog: 2.04,
              avoidableGrade4: 7.05,
              unavoidableGrade4: 0.08,
              total: 9.17,
            },
            {
              code: 'DKL',
              avoidableSawlog: 1.5,
              avoidableGrade4: 3.2,
              unavoidableGrade4: 0.1,
              total: 4.8,
            },
          ],
        },
        {
          name: 'Transition zone',
          districts: [
            {
              code: 'DTH',
              avoidableSawlog: 3.12,
              avoidableGrade4: 1.45,
              unavoidableGrade4: 0.22,
              total: 4.79,
            },
          ],
        },
        {
          name: 'Wet belt',
          districts: [],
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

describe('InteriorDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('header fields', () => {
    it('should render start date with ReadonlyInput and DateTag', async () => {
      render(
        <InteriorDetailView
          districtOptions={SAMPLE_DISTRICT_OPTIONS}
          data={createInteriorData()}
        />,
      );
      await waitFor(() => {});

      const startDateField = screen.getByTestId('readonly-input-start-date');
      expect(startDateField).toBeTruthy();
      expect(within(startDateField).getByTestId('readonly-label').textContent).toBe('Start date');

      const dateTag = within(startDateField).getByTestId('date-tag');
      expect(dateTag.getAttribute('data-date')).toBe('2024-01-01');
      expect(dateTag.getAttribute('data-format')).toBe('MMMM dd, yyyy');
    });

    it('should render end date with DateTag (NOT wrapped in ReadonlyInput)', async () => {
      render(
        <InteriorDetailView
          districtOptions={SAMPLE_DISTRICT_OPTIONS}
          data={createInteriorData()}
        />,
      );
      await waitFor(() => {});

      // End date in InteriorDetailView is rendered directly, NOT inside ReadonlyInput
      // Two DateTags: one for start date (inside ReadonlyInput), one for end date (direct)
      const allDateTags = screen.getAllByTestId('date-tag');
      expect(allDateTags.length).toBe(2);
      expect(allDateTags[0].getAttribute('data-date')).toBe('2024-01-01');
      expect(allDateTags[1].getAttribute('data-date')).toBe('2024-12-31');
    });

    it('should render table level factor with ReadonlyInput and PrecisionNumberTag', async () => {
      render(
        <InteriorDetailView
          districtOptions={SAMPLE_DISTRICT_OPTIONS}
          data={createInteriorData()}
        />,
      );
      await waitFor(() => {});

      const factorField = screen.getByTestId('readonly-input-dispersed-retention-reduction-factor');
      expect(factorField).toBeTruthy();

      const numberTag = within(factorField).getByTestId('precision-number-tag');
      expect(numberTag.getAttribute('data-value')).toBe('0.5');
      expect(numberTag.getAttribute('data-precision')).toBe('3');
    });

    it('should render heli multiplier ReadonlyInput with literal "TBD" text', async () => {
      render(
        <InteriorDetailView
          districtOptions={SAMPLE_DISTRICT_OPTIONS}
          data={createInteriorData()}
        />,
      );
      await waitFor(() => {});

      const heliField = screen.getByTestId('readonly-input-heli-multiplier');
      expect(heliField).toBeTruthy();
      // Children should contain "TBD" literal
      expect(within(heliField).getByTestId('readonly-children').textContent).toBe('TBD');
    });
  });

  describe('tabs and zones', () => {
    it('should render a tab for each zone', async () => {
      render(
        <InteriorDetailView
          districtOptions={SAMPLE_DISTRICT_OPTIONS}
          data={createInteriorData()}
        />,
      );
      await waitFor(() => {});

      expect(screen.getByRole('tab', { name: 'Dry belt' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Transition zone' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Wet belt' })).toBeTruthy();
    });

    it('should render DistrictZoneSection for each zone', async () => {
      render(
        <InteriorDetailView
          districtOptions={SAMPLE_DISTRICT_OPTIONS}
          data={createInteriorData()}
        />,
      );
      await waitFor(() => {});

      expect(screen.getAllByTestId('district-zone-section').length).toBe(3);
    });

    it('should pass correct zone names to DistrictZoneSection', async () => {
      render(
        <InteriorDetailView
          districtOptions={SAMPLE_DISTRICT_OPTIONS}
          data={createInteriorData()}
        />,
      );
      await waitFor(() => {});

      const zoneNames = screen.getAllByTestId('dzz-zone-name');
      expect(zoneNames[0].textContent).toBe('Dry belt');
      expect(zoneNames[1].textContent).toBe('Transition zone');
      expect(zoneNames[2].textContent).toBe('Wet belt');
    });

    it('should pass correct row counts per zone', async () => {
      render(
        <InteriorDetailView
          districtOptions={SAMPLE_DISTRICT_OPTIONS}
          data={createInteriorData()}
        />,
      );
      await waitFor(() => {});

      const rowCounts = screen.getAllByTestId('dzz-rows-count');
      expect(rowCounts[0].textContent).toBe('2'); // Dry belt: 2 districts
      expect(rowCounts[1].textContent).toBe('1'); // Transition zone: 1 district
      expect(rowCounts[2].textContent).toBe('0'); // Wet belt: 0 districts
    });

    it('should pass all 5 headers to DistrictZoneSection', async () => {
      render(
        <InteriorDetailView
          districtOptions={SAMPLE_DISTRICT_OPTIONS}
          data={createInteriorData()}
        />,
      );
      await waitFor(() => {});

      const headersCounts = screen.getAllByTestId('dzz-headers-count');
      headersCounts.forEach((el) => {
        expect(el.textContent).toBe('5');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null endDate — not render DateTag for end date', async () => {
      const data = createInteriorData({ endDate: null });
      render(<InteriorDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={data} />);
      await waitFor(() => {});

      // Only the start-date DateTag should render
      const dateTags = screen.getAllByTestId('date-tag');
      expect(dateTags.length).toBe(1);
    });

    it('should skip DateTag when startDate is an empty string', async () => {
      const data = createInteriorData({ startDate: '' });
      render(<InteriorDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={data} />);
      await waitFor(() => {});

      // startDate is '' (falsy), endDate is present — only end date renders
      const dateTags = screen.getAllByTestId('date-tag');
      expect(dateTags.length).toBe(1);
    });

    it('should handle empty zones array', async () => {
      const data = createInteriorData({
        tableData: { type: 'INTERIOR', zones: [], formulas: {} },
      });
      render(<InteriorDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={data} />);
      await waitFor(() => {});

      expect(screen.queryAllByTestId('district-zone-section').length).toBe(0);
      expect(screen.queryAllByRole('tab').length).toBe(0);
    });

    it('should handle zones with many districts', async () => {
      const data = createInteriorData();
      (
        data.tableData as {
          type: 'INTERIOR';
          zones: {
            name: string;
            districts: Record<string, unknown>[];
          }[];
        }
      ).zones[0].districts.push(
        {
          code: 'DN1',
          avoidableSawlog: 5.0,
          avoidableGrade4: 2.0,
          unavoidableGrade4: 0.5,
          total: 7.5,
        },
        {
          code: 'DN2',
          avoidableSawlog: 3.0,
          avoidableGrade4: 1.0,
          unavoidableGrade4: 0.25,
          total: 4.25,
        },
      );

      render(<InteriorDetailView districtOptions={SAMPLE_DISTRICT_OPTIONS} data={data} />);
      await waitFor(() => {});

      const rowCounts = screen.getAllByTestId('dzz-rows-count');
      expect(rowCounts[0].textContent).toBe('4'); // Dry belt: 2 original + 2 added
    });
  });

  describe('data validation', () => {
    it('should throw error when data.area is not INTERIOR', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onError = vi.fn();

      render(
        <TestErrorBoundary onError={onError}>
          <InteriorDetailView
            districtOptions={SAMPLE_DISTRICT_OPTIONS}
            data={
              {
                ...BASE_INTERIOR_DATA,
                area: 'COASTAL',
                tableData: { type: 'COASTAL', sections: [], formulas: {} },
              } as unknown as DistrictVolumeDetail
            }
          />
        </TestErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'InteriorDetailView requires data with area="INTERIOR"',
        }),
      );
      consoleSpy.mockRestore();
    });
  });
});

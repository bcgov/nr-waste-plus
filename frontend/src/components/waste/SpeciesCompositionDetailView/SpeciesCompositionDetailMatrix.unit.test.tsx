import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SpeciesCompositionDetailMatrix from './SpeciesCompositionDetailMatrix';

import type { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

interface MatrixHeader {
  key: string;
  header: string;
  headerTooltip?: string;
  renderAs?: (value: unknown) => ReactNode;
}

interface MatrixCallArgs {
  headers: MatrixHeader[];
  content: { content: unknown[]; page: { totalPages: number } };
}

// ============================================================================
// Mocks — vi.hoisted ensures the mock is available when vi.mock factory runs
// ============================================================================

const TableResourceMock = vi.hoisted(() =>
  vi.fn(({ headers }: { headers: MatrixHeader[]; content: MatrixCallArgs['content'] }) => (
    <div data-testid="table-resource" data-headers-count={headers.length} />
  )),
);

const useDistrictOptionsQueryMock = vi.hoisted(() =>
  vi.fn(() => ({
    data: [
      { code: 'DCC', description: 'Cariboo-Chilcotin' },
      { code: 'DCS', description: 'Coast' },
    ],
  })),
);

vi.mock('@/components/Form/TableResource', () => ({ default: TableResourceMock }));
vi.mock('@/config/react-query/hooks', () => ({
  useDistrictOptionsQuery: useDistrictOptionsQueryMock,
}));

// ============================================================================
// Helpers
// ============================================================================

const getMockCallArgs = (): MatrixCallArgs => TableResourceMock.mock.calls[0][0] as MatrixCallArgs;

const createTableData = () => ({
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
    {
      district: { code: 'DCS', description: 'Coast' },
      species: {
        AL: 10,
        AR: 0,
        AS: 0,
        BA: 30,
        BI: 0,
        CE: 0,
        CO: 0,
        CY: 15,
        FI: 5,
        HE: 20,
        LA: 0,
        LO: 0,
        MA: 0,
        SP: 10,
        UU: 0,
        WB: 0,
        WH: 0,
        WI: 0,
        YE: 0,
      },
    },
  ],
});

// ============================================================================
// Tests
// ============================================================================

describe('SpeciesCompositionDetailMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render TableResource with correct headers and content', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    expect(screen.getByTestId('table-resource')).toBeTruthy();

    const callArgs = getMockCallArgs();
    expect(callArgs.headers).toBeTruthy();
    expect(callArgs.content).toBeTruthy();
  });

  it('should render with empty rows', () => {
    render(<SpeciesCompositionDetailMatrix rows={[]} />);

    expect(screen.getByTestId('table-resource')).toBeTruthy();
    expect(getMockCallArgs().content.content).toEqual([]);
  });

  it('should render with multiple rows', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    expect(screen.getByTestId('table-resource')).toBeTruthy();
    expect(getMockCallArgs().content.content).toHaveLength(2);
  });

  it('should fetch district options via useDistrictOptionsQuery', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    expect(useDistrictOptionsQueryMock).toHaveBeenCalledOnce();
  });

  it('should pass district column with TooltipTag renderAs', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    const { headers } = getMockCallArgs();
    const districtHeader = headers.find((h) => h.key === 'district');

    expect(districtHeader).toBeTruthy();
    expect(typeof districtHeader?.renderAs).toBe('function');

    const result = districtHeader?.renderAs?.({ code: 'DCC', description: 'Cariboo-Chilcotin' });
    expect(result).toBeTruthy();
  });

  it('should pass numeric species columns without renderAs', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    const { headers } = getMockCallArgs();
    const numericColumns = ['species.AL', 'species.CE', 'species.CO', 'species.YE'];

    for (const col of numericColumns) {
      const header = headers.find((h) => h.key === col);
      expect(header).toBeTruthy();
      expect(header?.renderAs).toBeUndefined();
    }
  });

  it('should set headerTooltip on each species column', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    const { headers } = getMockCallArgs();
    const speciesHeaders = headers.filter((h) => h.key.startsWith('species.'));

    expect(speciesHeaders.length).toBeGreaterThan(0);
    for (const header of speciesHeaders) {
      expect(header.headerTooltip).toBeTruthy();
      expect(typeof header.headerTooltip).toBe('string');
    }
  });

  it('should have correct number of headers (1 district + 19 species columns)', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    expect(getMockCallArgs().headers.length).toBe(20);
  });

  it('should include all expected column keys', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    const keys = getMockCallArgs().headers.map((h) => h.key);

    expect(keys).toContain('district');

    const expectedSpecies = [
      'species.AL',
      'species.AR',
      'species.AS',
      'species.BA',
      'species.BI',
      'species.CE',
      'species.CO',
      'species.CY',
      'species.FI',
      'species.HE',
      'species.LA',
      'species.LO',
      'species.MA',
      'species.SP',
      'species.UU',
      'species.WB',
      'species.WH',
      'species.WI',
      'species.YE',
    ];

    for (const species of expectedSpecies) {
      expect(keys).toContain(species);
    }
  });

  it('should render district column header as "District"', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    const { headers } = getMockCallArgs();
    const districtHeader = headers.find((h) => h.key === 'district');
    expect(districtHeader?.header).toBe('District');
  });

  it('should render species column headers with proper labels', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    const { headers } = getMockCallArgs();

    expect(headers.find((h) => h.key === 'species.AL')?.header).toBe('AL');
    expect(headers.find((h) => h.key === 'species.SP')?.header).toBe('SP');
    expect(headers.find((h) => h.key === 'species.YE')?.header).toBe('YE');
  });

  it('should pass content with correct page structure and row IDs', () => {
    const tableData = createTableData();
    render(<SpeciesCompositionDetailMatrix rows={tableData.rows} />);

    const callArgs = getMockCallArgs();
    const expected = tableData.rows.map((row) => ({
      ...row,
      id: row.district.code,
    }));
    expect(callArgs.content.content).toEqual(expected);
    expect(callArgs.content.page.totalPages).toBe(1);
  });
});

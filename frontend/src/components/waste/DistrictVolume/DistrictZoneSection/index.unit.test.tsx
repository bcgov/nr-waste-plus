import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import DistrictZoneSection from './index';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { CoastDistrictRow, InteriorDistrictRow } from '@/services/districtvolumes.types';

// ============================================================================
// Mocks
// ============================================================================

// Mock TableResource so we don't need the full Carbon rendering stack.
const mockTableResourceId = vi.fn();
vi.mock('@/components/Form/TableResource', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    mockTableResourceId(props.id);
    return (
      <div data-testid="table-resource">
        <span data-testid="tr-id">{props.id}</span>
        <span data-testid="tr-headers-count">{props.headers.length}</span>
        <span data-testid="tr-content-count">{props.content.content.length}</span>
        <span data-testid="tr-loading">{String(props.loading)}</span>
        <span data-testid="tr-error">{String(props.error)}</span>
        {/* Render first district code to verify mapping */}
        {props.content.content.length > 0 && (
          <span data-testid="tr-first-id">{String(props.content.content[0].id)}</span>
        )}
        {/* Render first row to verify spread preserves original props */}
        {props.content.content.length > 0 && (
          <span data-testid="tr-first-code">{String(props.content.content[0].code)}</span>
        )}
        {/* Render page metadata */}
        {props.content.page && (
          <>
            <span data-testid="tr-page-size">{props.content.page.size}</span>
            <span data-testid="tr-page-number">{props.content.page.number}</span>
            <span data-testid="tr-page-total">{props.content.page.totalElements}</span>
            <span data-testid="tr-page-total-pages">{props.content.page.totalPages}</span>
          </>
        )}
        {/* Render headers array to verify renderAs is passed through */}
        <span data-testid="tr-headers-json">{JSON.stringify(props.headers)}</span>
        {/* Render entire content object to verify the spread creates an id */}
        <span data-testid="tr-content-json">{JSON.stringify(props.content)}</span>
      </div>
    );
  },
}));

// ============================================================================
// Test data
// ============================================================================

const interiorHeaders: TableHeaderType<InteriorDistrictRow>[] = [
  { key: 'code', header: 'District' },
  { key: 'avoidableSawlog', header: 'Avoidable Sawlog' },
  { key: 'avoidableGrade4', header: 'Avoidable Grade Y/4' },
  { key: 'unavoidableGrade4', header: 'Unavoidable' },
  { key: 'total', header: 'Total' },
];

const interiorRows: InteriorDistrictRow[] = [
  {
    code: 'DCC',
    avoidableSawlog: 2.04,
    avoidableGrade4: 7.05,
    unavoidableGrade4: 0.08,
    total: 9.17,
  },
  { code: 'DKL', avoidableSawlog: 1.5, avoidableGrade4: 3.2, unavoidableGrade4: 0.1, total: 4.8 },
];

const coastHeaders: TableHeaderType<CoastDistrictRow>[] = [
  { key: 'code', header: 'District' },
  { key: 'avoidableSawlog', header: 'Avoidable Sawlog' },
  { key: 'avoidableHembalGradeU', header: 'Avoidable 0.25' },
  { key: 'avoidableGradeY', header: 'Avoidable Grade Y' },
  { key: 'unavoidable', header: 'Unavoidable' },
  { key: 'total', header: 'Total' },
];

const coastRows: CoastDistrictRow[] = [
  {
    code: 'DCK',
    avoidableSawlog: 16.19,
    avoidableHembalGradeU: 8.87,
    avoidableGradeY: 5.24,
    unavoidable: 1.18,
    total: 31.48,
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('DistrictZoneSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render TableResource with correct zone-based id', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      expect(screen.getByTestId('table-resource')).toBeTruthy();
      expect(screen.getByTestId('tr-id').textContent).toBe('district-zone-Dry belt');
    });

    it('should pass correct number of headers to TableResource', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      expect(screen.getByTestId('tr-headers-count').textContent).toBe('5');
    });

    it('should pass headers through unchanged', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      const parsed = JSON.parse(screen.getByTestId('tr-headers-json').textContent!);
      expect(parsed).toEqual(interiorHeaders);
    });

    it('should render with zone name containing spaces and hyphens', () => {
      render(
        <DistrictZoneSection
          zoneName="Transition zone"
          rows={interiorRows}
          headers={interiorHeaders}
        />,
      );

      expect(screen.getByTestId('tr-id').textContent).toBe('district-zone-Transition zone');
    });
  });

  describe('content mapping', () => {
    it('should map rows with id from code for TableResource content', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      // id is derived from code via spread: { ...row, id: row.code }
      expect(screen.getByTestId('tr-first-id').textContent).toBe('DCC');
      expect(screen.getByTestId('tr-first-code').textContent).toBe('DCC');
    });

    it('should pass correct number of content items matching row count', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      expect(screen.getByTestId('tr-content-count').textContent).toBe('2');
    });

    it('should create a new object per row (immutable — original rows lack id)', () => {
      const originalRow = { ...interiorRows[0] };
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={[originalRow]} headers={interiorHeaders} />,
      );

      // Original should be unchanged (spread creates new objects)
      expect(originalRow).not.toHaveProperty('id');
      expect(originalRow.code).toBe('DCC');
    });

    it('should assign each content item its own id equal to code', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      const content = JSON.parse(screen.getByTestId('tr-content-json').textContent!);
      expect(content.content).toHaveLength(2);
      expect(content.content[0].id).toBe('DCC');
      expect(content.content[1].id).toBe('DKL');
      // Original properties are preserved
      expect(content.content[0].avoidableSawlog).toBe(2.04);
    });

    it('should handle empty rows array gracefully', () => {
      render(<DistrictZoneSection zoneName="Dry belt" rows={[]} headers={interiorHeaders} />);

      expect(screen.getByTestId('tr-content-count').textContent).toBe('0');
      expect(screen.getByTestId('tr-page-total').textContent).toBe('0');
    });

    it('should handle single row', () => {
      const singleRow: InteriorDistrictRow[] = [interiorRows[0]];
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={singleRow} headers={interiorHeaders} />,
      );

      expect(screen.getByTestId('tr-content-count').textContent).toBe('1');
    });

    it('should work with many rows', () => {
      const manyRows: InteriorDistrictRow[] = Array.from({ length: 50 }, (_, i) => ({
        code: `D${String(i).padStart(3, '0')}`,
        avoidableSawlog: i + 0.5,
        avoidableGrade4: i * 2,
        unavoidableGrade4: i * 0.1,
        total: i * 3 + 0.5,
      }));
      render(<DistrictZoneSection zoneName="Large" rows={manyRows} headers={interiorHeaders} />);

      expect(screen.getByTestId('tr-content-count').textContent).toBe('50');
      expect(screen.getByTestId('tr-page-size').textContent).toBe('50');
    });
  });

  describe('loading state', () => {
    it('should show loading state when loading prop is true', () => {
      render(
        <DistrictZoneSection
          zoneName="Dry belt"
          rows={interiorRows}
          headers={interiorHeaders}
          loading={true}
        />,
      );

      expect(screen.getByTestId('tr-loading').textContent).toBe('true');
    });

    it('should show non-loading state when loading is false (explicit)', () => {
      render(
        <DistrictZoneSection
          zoneName="Dry belt"
          rows={interiorRows}
          headers={interiorHeaders}
          loading={false}
        />,
      );

      expect(screen.getByTestId('tr-loading').textContent).toBe('false');
    });

    it('should default loading to false when not provided', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      expect(screen.getByTestId('tr-loading').textContent).toBe('false');
    });
  });

  describe('error state', () => {
    it('should always pass error=false to TableResource', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );
      render(
        <DistrictZoneSection
          zoneName="Other"
          rows={interiorRows}
          headers={interiorHeaders}
          loading={true}
        />,
      );

      // Both renders should have error=false
      const errorElements = screen.getAllByTestId('tr-error');
      expect(errorElements).toHaveLength(2);
      expect(errorElements[0].textContent).toBe('false');
      expect(errorElements[1].textContent).toBe('false');
    });
  });

  describe('page metadata', () => {
    it('should pass page.size equal to rows.length', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      expect(screen.getByTestId('tr-page-size').textContent).toBe('2');
    });

    it('should pass page.number=0 (static, non-paginated)', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      expect(screen.getByTestId('tr-page-number').textContent).toBe('0');
    });

    it('should pass page.totalElements equal to row count', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      expect(screen.getByTestId('tr-page-total').textContent).toBe('2');
    });

    it('should pass page.totalPages=1 (static, non-paginated)', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      expect(screen.getByTestId('tr-page-total-pages').textContent).toBe('1');
    });

    it('should have correct page metadata for coast data', () => {
      render(<DistrictZoneSection zoneName="Mature" rows={coastRows} headers={coastHeaders} />);

      expect(screen.getByTestId('tr-page-size').textContent).toBe('1');
      expect(screen.getByTestId('tr-page-number').textContent).toBe('0');
      expect(screen.getByTestId('tr-page-total').textContent).toBe('1');
      expect(screen.getByTestId('tr-page-total-pages').textContent).toBe('1');
    });
  });

  describe('type polymorphism', () => {
    it('should work with coast district data type and layout-specific headers', () => {
      render(<DistrictZoneSection zoneName="Mature" rows={coastRows} headers={coastHeaders} />);

      expect(screen.getByTestId('tr-id').textContent).toBe('district-zone-Mature');
      expect(screen.getByTestId('tr-first-id').textContent).toBe('DCK');
      expect(screen.getByTestId('tr-first-code').textContent).toBe('DCK');
      expect(screen.getByTestId('tr-headers-count').textContent).toBe('6');
    });

    it('should render coast data with coast-specific numeric values', () => {
      render(<DistrictZoneSection zoneName="Mature" rows={coastRows} headers={coastHeaders} />);

      const content = JSON.parse(screen.getByTestId('tr-content-json').textContent!);
      expect(content.content[0].avoidableHembalGradeU).toBe(8.87);
      expect(content.content[0].avoidableGradeY).toBe(5.24);
    });

    it('should handle interior data with interior-specific headers', () => {
      render(
        <DistrictZoneSection zoneName="Dry belt" rows={interiorRows} headers={interiorHeaders} />,
      );

      const headers = JSON.parse(screen.getByTestId('tr-headers-json').textContent!);
      const keys = headers.map((h: { key: string }) => h.key);
      expect(keys).toContain('avoidableGrade4');
      expect(keys).toContain('unavoidableGrade4');
      expect(keys).not.toContain('avoidableHembalGradeU');
    });
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { headers } from './constants.tsx';

import type { FormulaSetResponse } from '@/services/formulaConfiguration.types.ts';

describe('FormulaConfigurationListTable headers', () => {
  it('exports six headers in a stable order', () => {
    expect(headers).toHaveLength(6);
    expect(headers.map((h) => h.key)).toEqual([
      'area',
      'startDate',
      'endDate',
      'formulas',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('uses the expected header labels', () => {
    expect(headers.map((h) => h.header)).toEqual([
      'Area',
      'Start date',
      'End date',
      'Formulas',
      'Created',
      'Updated',
    ]);
  });

  it('marks only area and startDate as sortable', () => {
    expect(headers.find((h) => h.key === 'area')?.sortable).toBe(true);
    expect(headers.find((h) => h.key === 'startDate')?.sortable).toBe(true);
    expect(headers.find((h) => h.key === 'endDate')?.sortable).toBe(false);
    expect(headers.find((h) => h.key === 'formulas')?.sortable).toBe(false);
    expect(headers.find((h) => h.key === 'createdAt')?.sortable).toBe(false);
    expect(headers.find((h) => h.key === 'updatedAt')?.sortable).toBe(false);
  });

  it('marks area, startDate, endDate and formulas as selected', () => {
    expect(headers.find((h) => h.key === 'area')?.selected).toBe(true);
    expect(headers.find((h) => h.key === 'startDate')?.selected).toBe(true);
    expect(headers.find((h) => h.key === 'endDate')?.selected).toBe(true);
    expect(headers.find((h) => h.key === 'formulas')?.selected).toBe(true);
    expect(headers.find((h) => h.key === 'createdAt')?.selected).toBe(false);
    expect(headers.find((h) => h.key === 'updatedAt')?.selected).toBe(false);
  });

  describe('area renderAs', () => {
    it('renders the mapped display value for INTERIOR', () => {
      const areaHeader = headers.find((h) => h.key === 'area');
      render(<>{areaHeader?.renderAs?.('INTERIOR' as never)}</>);
      screen.getByText('Interior');
    });

    it('renders the mapped display value for COASTAL', () => {
      const areaHeader = headers.find((h) => h.key === 'area');
      render(<>{areaHeader?.renderAs?.('COASTAL' as never)}</>);
      screen.getByText('Coastal');
    });

    it('falls back to the raw value for unknown areas', () => {
      const areaHeader = headers.find((h) => h.key === 'area');
      render(<>{areaHeader?.renderAs?.('NORTH' as never)}</>);
      screen.getByText('NORTH');
    });
  });

  describe('startDate renderAs', () => {
    it('renders a formatted date', () => {
      const startDateHeader = headers.find((h) => h.key === 'startDate');
      render(<>{startDateHeader?.renderAs?.('2026-05-14' as never)}</>);
      screen.getByText('May 14, 2026');
    });
  });

  describe('endDate renderAs', () => {
    it('renders a formatted date when a value is present', () => {
      const endDateHeader = headers.find((h) => h.key === 'endDate');
      render(<>{endDateHeader?.renderAs?.('2026-12-31' as never)}</>);
      screen.getByText('December 31, 2026');
    });

    it('renders an em dash when no end date is present', () => {
      const endDateHeader = headers.find((h) => h.key === 'endDate');
      render(<>{endDateHeader?.renderAs?.(null as never)}</>);
      screen.getByText('\u2014');
    });
  });

  describe('formulas renderAs', () => {
    it('renders the length of the formulas array', () => {
      const formulasHeader = headers.find((h) => h.key === 'formulas');
      const data: Partial<FormulaSetResponse> = {
        formulas: [{}, {}, {}] as FormulaSetResponse['formulas'],
      };
      render(<>{formulasHeader?.renderAs?.(data.formulas as never)}</>);
      screen.getByText('3');
    });

    it('renders 0 when formulas is missing', () => {
      const formulasHeader = headers.find((h) => h.key === 'formulas');
      render(<>{formulasHeader?.renderAs?.(undefined as never)}</>);
      screen.getByText('0');
    });
  });

  describe('createdAt and updatedAt renderAs', () => {
    it('renders a formatted date-time for createdAt', () => {
      const createdAtHeader = headers.find((h) => h.key === 'createdAt');
      render(<>{createdAtHeader?.renderAs?.('2026-05-15T14:23:00' as never)}</>);
      screen.getByText('May 15, 2026 2:23 PM');
    });

    it('renders a formatted date-time for updatedAt', () => {
      const updatedAtHeader = headers.find((h) => h.key === 'updatedAt');
      render(<>{updatedAtHeader?.renderAs?.('2026-06-01T10:00:00' as never)}</>);
      screen.getByText('Jun 01, 2026 10:00 AM');
    });
  });
});

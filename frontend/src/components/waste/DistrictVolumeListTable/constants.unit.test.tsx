import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { headers } from './constants';

describe('District Volume List headers', () => {
  it('should export 5 column headers', () => {
    expect(headers).toHaveLength(5);
  });

  it('should have correct header keys', () => {
    const keys = headers.map((h) => h.key);
    expect(keys).toEqual(['area', 'startDate', 'endDate', 'uploadedBy', 'dateOfUpload']);
  });

  it('should have correct header labels', () => {
    const labels = headers.map((h) => h.header);
    expect(labels).toEqual(['Area', 'Start date', 'End date', 'Uploaded by', 'Date of upload']);
  });

  it('should have Area column as sortable', () => {
    const areaHeader = headers.find((h) => h.key === 'area');
    expect(areaHeader?.sortable).toBe(true);
  });

  it('should have non-area columns as not sortable', () => {
    const nonAreaHeaders = headers.filter((h) => h.key !== 'area');
    for (const header of nonAreaHeaders) {
      expect(header.sortable).toBe(false);
    }
  });

  it('should have all columns selected by default', () => {
    for (const header of headers) {
      expect(header.selected).toBe(true);
    }
  });

  describe('Area column renderAs', () => {
    it('should render Interior for INTERIOR area', () => {
      const areaHeader = headers.find((h) => h.key === 'area');
      render(<>{areaHeader?.renderAs?.('INTERIOR')}</>);
      expect(screen.getByText('Interior')).toBeTruthy();
    });

    it('should render Coast for COASTAL area', () => {
      const areaHeader = headers.find((h) => h.key === 'area');
      render(<>{areaHeader?.renderAs?.('COASTAL')}</>);
      expect(screen.getByText('Coast')).toBeTruthy();
    });

    it('should render raw value for unknown area', () => {
      const areaHeader = headers.find((h) => h.key === 'area');
      render(<>{areaHeader?.renderAs?.('UNKNOWN')}</>);
      expect(screen.getByText('UNKNOWN')).toBeTruthy();
    });
  });

  describe('EndDate column renderAs', () => {
    it('should render dash for null end date', () => {
      const endDateHeader = headers.find((h) => h.key === 'endDate');
      render(<>{endDateHeader?.renderAs?.(null)}</>);
      expect(screen.getByText('-')).toBeTruthy();
    });

    it('should render raw date string for non-null end date', () => {
      const endDateHeader = headers.find((h) => h.key === 'endDate');
      render(<>{endDateHeader?.renderAs?.('2026-05-14')}</>);
      expect(screen.getByText('2026-05-14')).toBeTruthy();
    });
  });
});

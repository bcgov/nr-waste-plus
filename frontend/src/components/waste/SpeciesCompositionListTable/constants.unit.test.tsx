import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { headers } from './constants';

describe('Species Composition List headers', () => {
  it('should export 4 column headers', () => {
    expect(headers).toHaveLength(4);
  });

  it('should have correct header keys', () => {
    const keys = headers.map((h) => h.key);
    expect(keys).toEqual(['startDate', 'endDate', 'uploadedBy', 'dateOfUpload']);
  });

  it('should have correct header labels', () => {
    const labels = headers.map((h) => h.header);
    expect(labels).toEqual(['Start date', 'End date', 'Uploaded by', 'Date of upload']);
  });

  it('should have Start date column as sortable', () => {
    const startDateHeader = headers.find((h) => h.key === 'startDate');
    expect(startDateHeader?.sortable).toBe(true);
  });

  it('should have non-start-date columns as not sortable', () => {
    const nonStartDateHeaders = headers.filter((h) => h.key !== 'startDate');
    for (const header of nonStartDateHeaders) {
      expect(header.sortable).toBe(false);
    }
  });

  it('should have all columns selected by default', () => {
    for (const header of headers) {
      expect(header.selected).toBe(true);
    }
  });

  describe('Start date column renderAs', () => {
    it('should render a formatted date string', () => {
      const startDateHeader = headers.find((h) => h.key === 'startDate');
      render(<>{startDateHeader?.renderAs?.('2025-01-01')}</>);
      expect(screen.getByText('January 01, 2025')).toBeTruthy();
    });
  });

  describe('End date column renderAs', () => {
    it('should render invalid-date marker for null end date', () => {
      const endDateHeader = headers.find((h) => h.key === 'endDate');
      render(<>{endDateHeader?.renderAs?.(null)}</>);
      expect(screen.getByTestId('invalid-date')).toBeTruthy();
    });

    it('should render formatted date string for non-null end date', () => {
      const endDateHeader = headers.find((h) => h.key === 'endDate');
      render(<>{endDateHeader?.renderAs?.('2026-05-14')}</>);
      expect(screen.getByText('May 14, 2026')).toBeTruthy();
    });
  });

  describe('Date of upload column renderAs', () => {
    it('should render a formatted date string', () => {
      const dateOfUploadHeader = headers.find((h) => h.key === 'dateOfUpload');
      render(<>{dateOfUploadHeader?.renderAs?.('2025-01-15T10:30:00')}</>);
      expect(screen.getByText('Jan 15, 2025')).toBeTruthy();
    });
  });
});

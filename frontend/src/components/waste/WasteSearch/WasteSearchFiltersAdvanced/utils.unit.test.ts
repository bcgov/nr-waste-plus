import { DateTime } from 'luxon';
import { describe, it, expect } from 'vitest';

import {
  getStartMaxDate,
  getEndMinDate,
  getStartDateValue,
  getEndDateValue,
  DATE_PICKER_FORMAT,
  API_DATE_FORMAT,
} from './utils'; // adjust path as needed

const sampleApiDate = '2023-08-15';
const expectedPickerDate = DateTime.fromFormat(sampleApiDate, API_DATE_FORMAT).toFormat(
  DATE_PICKER_FORMAT,
);

describe('Date Utils', () => {
  describe('getStartMaxDate', () => {
    it('should convert valid API date to picker format', () => {
      expect(getStartMaxDate(sampleApiDate)).toBe(expectedPickerDate);
    });

    it('should return current date in picker format if value is null', () => {
      const now = DateTime.now().toFormat(DATE_PICKER_FORMAT);
      expect(getStartMaxDate(null)).toBe(now);
    });

    it('should return current date in picker format if value is undefined', () => {
      const now = DateTime.now().toFormat(DATE_PICKER_FORMAT);
      expect(getStartMaxDate(undefined)).toBe(now);
    });
  });

  describe('getEndMinDate', () => {
    it('should convert valid API date to picker format', () => {
      expect(getEndMinDate(sampleApiDate)).toBe(expectedPickerDate);
    });

    it('should return undefined if value is null', () => {
      expect(getEndMinDate(null)).toBeUndefined();
    });

    it('should return undefined if value is undefined', () => {
      expect(getEndMinDate(undefined)).toBeUndefined();
    });
  });

  describe('getStartDateValue', () => {
    it('should convert valid API date to picker format', () => {
      expect(getStartDateValue(sampleApiDate)).toBe(expectedPickerDate);
    });

    it('should return undefined if value is null', () => {
      expect(getStartDateValue(null)).toBeUndefined();
    });

    it('should return undefined if value is undefined', () => {
      expect(getStartDateValue(undefined)).toBeUndefined();
    });
  });

  describe('getEndDateValue', () => {
    it('should convert valid API date to picker format', () => {
      expect(getEndDateValue(sampleApiDate)).toBe(expectedPickerDate);
    });

    it('should return undefined if value is null', () => {
      expect(getEndDateValue(null)).toBeUndefined();
    });

    it('should return undefined if value is undefined', () => {
      expect(getEndDateValue(undefined)).toBeUndefined();
    });
  });
});

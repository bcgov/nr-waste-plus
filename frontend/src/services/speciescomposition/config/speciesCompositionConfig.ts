import type { SpeciesKey } from '@/services/speciesComposition.types';

// ─── SPREADSHEET LAYOUT ──────────────────────────────────────────────────────
/** Row index containing the species column headers (1-indexed). */
export const HEADER_ROW = 3;

/** First data row index containing district data (1-indexed). */
export const DATA_START_ROW = 4;

/** Column index for district codes (1-indexed, column B). */
export const DISTRICT_COL = 2;

/** Column index where species values begin (1-indexed, column C). */
export const SPECIES_START_COL = 3;

// ─── DISTRICT CODES ──────────────────────────────────────────────────────────
/** All 23 BC natural resource district codes expected in the spreadsheet. */
export const EXPECTED_DISTRICT_CODES = [
  'DCC',
  'DCK',
  'DCR',
  'DCS',
  'DFN',
  'DKA',
  'DKM',
  'DMH',
  'DMK',
  'DND',
  'DNI',
  'DOS',
  'DPC',
  'DPG',
  'DQC',
  'DQU',
  'DRM',
  'DSC',
  'DSE',
  'DSI',
  'DSQ',
  'DSS',
  'DVA',
] as const;

// ─── SPECIES HEADERS ─────────────────────────────────────────────────────────
/** Expected header text for each species column (case-insensitive matching). */
export const EXPECTED_SPECIES_HEADERS: readonly SpeciesKey[] = [
  'AL',
  'AR',
  'AS',
  'BA',
  'BI',
  'CE',
  'CO',
  'CY',
  'FI',
  'HE',
  'LA',
  'LO',
  'MA',
  'SP',
  'UU',
  'WB',
  'WH',
  'WI',
  'YE',
];

/**
 * Maps normalised (lowercase, trimmed) header text to the corresponding
 * {@link SpeciesKey}. Used by the processor to resolve column positions.
 */
export const HEADER_TO_SPECIES_KEY: Record<string, SpeciesKey> = {
  al: 'AL',
  ar: 'AR',
  as: 'AS',
  ba: 'BA',
  bi: 'BI',
  ce: 'CE',
  co: 'CO',
  cy: 'CY',
  fi: 'FI',
  he: 'HE',
  la: 'LA',
  lo: 'LO',
  ma: 'MA',
  sp: 'SP',
  uu: 'UU',
  wb: 'WB',
  wh: 'WH',
  wi: 'WI',
  ye: 'YE',
};

/** Regex matching a valid 3-uppercase-letter district code. */
export const DISTRICT_CODE_REGEX = /^[A-Z]{3}$/;

/** Patterns that identify summary/average rows (skipped during district validation). */
export const SUMMARY_ROW_PATTERNS = /weighted|average|total/i;

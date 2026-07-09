import type { SpeciesKey } from '@/services/speciescomposition/speciesComposition.types';

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

/** Expected header text for each species column (case-insensitive matching). */
export const EXPECTED_SPECIES_HEADERS: readonly string[] = [
  'Balsam',
  'Cedar',
  'Cottonwood',
  'Cypress',
  'Fir',
  'Hemlock',
  'Larch',
  'Maple',
  'Pine',
  'Poplar',
  'Redcedar',
  'Redwood',
  'Spruce',
  'Whitebirch',
  'Whitepine',
  'Yew',
  'Other',
  'Unknown',
  'Total',
];

/**
 * Maps normalised (lowercase, trimmed) header text to the corresponding
 * {@link SpeciesKey}. Used by the processor to resolve column positions.
 */
export const HEADER_TO_SPECIES_KEY: Record<string, SpeciesKey> = {
  balsam: 'balsam',
  cedar: 'cedar',
  cottonwood: 'cottonwood',
  cypress: 'cypress',
  fir: 'fir',
  hemlock: 'hemlock',
  larch: 'larch',
  maple: 'maple',
  pine: 'pine',
  poplar: 'poplar',
  redcedar: 'redcedar',
  redwood: 'redwood',
  spruce: 'spruce',
  whitebirch: 'whitebirch',
  whitepine: 'whitepine',
  yew: 'yew',
  other: 'other',
  unknown: 'unknown',
  total: 'total',
};

/** Regex matching a valid 3-uppercase-letter district code. */
export const DISTRICT_CODE_REGEX = /^[A-Z]{3}$/;

/** Patterns that identify summary/average rows (skipped during district validation). */
export const SUMMARY_ROW_PATTERNS = /weighted|average|total/i;

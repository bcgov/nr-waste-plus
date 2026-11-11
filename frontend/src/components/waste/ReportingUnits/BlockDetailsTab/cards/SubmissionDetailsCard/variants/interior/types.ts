import { toSelectedItem as toSelectedItemFromFormat } from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/format';

import type { CodeDescriptionDto } from '@/types/search.types';

export interface InteriorSubmissionDetailsValues {
  readonly primaryLoggingCompleteDate: string;
  readonly harvestStatusCode: string;
  readonly becZoneCode: string;
  readonly becSubzoneVariantCode: string;
  readonly benchmarkZone: string;
  readonly wasteBenchmark: string;
  readonly hasDispersedRetention: boolean;
  readonly dispersedRetentionPct: string;
  readonly dispersedRetentionExplanation: string;
  /** Multi-select (D28). Stores selected criteria codes. */
  readonly districtAverageCriteriaCodes: readonly string[];
  /** S6/BR-2: secondary timber marks (max 5, normalized). */
  readonly secondaryTimberMarks: readonly string[];
  /** S6/BR-2: road permit timber marks (max 5, normalized). */
  readonly roadPermitTimberMarks: readonly string[];
}

/** One BEC subzone/variant option, scoped to its parent BEC zone. */
export interface InteriorBecSubzoneVariantOption extends CodeDescriptionDto {
  readonly becZoneCode: string;
}

export interface InteriorSubmissionDetailsFormProps {
  readonly mode: 'form' | 'read-only';
  readonly initialValues?: Partial<InteriorSubmissionDetailsValues>;
  readonly harvestStatuses: readonly CodeDescriptionDto[];
  readonly becZones: readonly CodeDescriptionDto[];
  readonly becSubzoneVariants: readonly InteriorBecSubzoneVariantOption[];
  readonly districtAverageCriteria: readonly CodeDescriptionDto[];
  readonly onAddSecondaryTimberMark?: () => void;
  readonly onAddRoadPermitTimberMark?: () => void;
}

export type InteriorSubmissionDetailsReadOnlyProps = Omit<
  InteriorSubmissionDetailsFormProps,
  'mode' | 'onAddSecondaryTimberMark' | 'onAddRoadPermitTimberMark'
>;

export const EMPTY_VALUES: InteriorSubmissionDetailsValues = {
  primaryLoggingCompleteDate: '',
  harvestStatusCode: '',
  becZoneCode: '',
  becSubzoneVariantCode: '',
  benchmarkZone: '',
  wasteBenchmark: '',
  hasDispersedRetention: false,
  dispersedRetentionPct: '',
  dispersedRetentionExplanation: '',
  districtAverageCriteriaCodes: [],
  secondaryTimberMarks: [],
  roadPermitTimberMarks: [],
};

export const normalizeInitialValues = (
  initialValues?: Partial<InteriorSubmissionDetailsValues> & {
    readonly districtAverageCriteriaCode?: string;
  },
): InteriorSubmissionDetailsValues => {
  if (!initialValues) return EMPTY_VALUES;
  const legacy = (initialValues as { districtAverageCriteriaCode?: string }).districtAverageCriteriaCode;
  const codes =
    initialValues.districtAverageCriteriaCodes ??
    (legacy ? [legacy] : EMPTY_VALUES.districtAverageCriteriaCodes);
  const { districtAverageCriteriaCode: _legacy, ...rest } = initialValues as Record<string, unknown>;
  return {
    ...EMPTY_VALUES,
    ...(rest as Partial<InteriorSubmissionDetailsValues>),
    districtAverageCriteriaCodes: codes,
  };
};

/** Back-compat re-export; canonical implementation lives in shared/format. */
export const toSelectedItem = toSelectedItemFromFormat;

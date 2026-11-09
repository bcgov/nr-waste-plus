import type { CodeDescriptionDto } from '@/types/search.types';

/**
 * Field values owned by the Interior submission-details twins. Both the form
 * and read-only views seed from the same shape, so the two stay in lockstep.
 */
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
  readonly districtAverageCriteriaCode: string;
}

/** One BEC subzone/variant option, scoped to its parent BEC zone. */
export interface InteriorBecSubzoneVariantOption extends CodeDescriptionDto {
  readonly becZoneCode: string;
}

/**
 * Public props for the Interior submission-details component: {@linkcode mode}
 * selects the twin, the callbacks drive the timber-mark sections.
 */
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

/**
 * Props for the read-only twin: the same data as the form twin minus the mode
 * selector and the add-mark callbacks it never renders.
 */
export type InteriorSubmissionDetailsReadOnlyProps = Omit<
  InteriorSubmissionDetailsFormProps,
  'mode' | 'onAddSecondaryTimberMark' | 'onAddRoadPermitTimberMark'
>;

/** Seed values merged under the caller-supplied {@link initialValues}. */
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
  districtAverageCriteriaCode: '',
};

/**
 * Finds the option matching a stored code.
 *
 * @param options the option list to search
 * @param code the stored code; empty string matches nothing
 * @returns the matching option, or null when the code is unset or unknown
 */
export const toSelectedItem = (
  options: readonly CodeDescriptionDto[],
  code: string,
): CodeDescriptionDto | null => options.find((option) => option.code === code) ?? null;

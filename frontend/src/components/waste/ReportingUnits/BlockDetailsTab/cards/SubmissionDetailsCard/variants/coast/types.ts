import type { CodeDescriptionDto } from '@/types/search.types';

export interface CoastSubmissionDetailsValues {
  readonly primaryLoggingCompleteDate: string;
  readonly harvestStatusCode: string;
  readonly maturityCode: string;
  readonly isHeliLogging: boolean;
  readonly cableYardingAreaHa: string;
  readonly groundBasedAreaHa: string;
  readonly skylineLoggingAreaHa: string;
  readonly wasteBenchmark: string;
  readonly hasDispersedRetention: boolean;
  readonly dispersedRetentionPct: string;
  readonly dispersedRetentionExplanation: string;
  /** Multi-select (D28). */
  readonly districtAverageCriteriaCodes: readonly string[];
  /** S6/BR-2: secondary timber marks (max 5, normalized). */
  readonly secondaryTimberMarks: readonly string[];
  /** S6/BR-2: road permit timber marks (max 5, normalized). */
  readonly roadPermitTimberMarks: readonly string[];
}

export interface CoastSubmissionDetailsFormProps {
  readonly mode: 'form' | 'read-only';
  readonly initialValues?: Partial<CoastSubmissionDetailsValues> & {
    readonly districtAverageCriteriaCode?: string;
    readonly secondaryTimberMarks?: readonly (
      string | { mark?: string | null; timberMark?: string | null }
    )[];
    readonly roadPermitTimberMarks?: readonly (
      string | { mark?: string | null; timberMark?: string | null }
    )[];
  };
  readonly harvestStatuses: readonly CodeDescriptionDto[];
  readonly maturityOptions: readonly CodeDescriptionDto[];
  readonly districtAverageCriteria: readonly CodeDescriptionDto[];
  readonly onAddSecondaryTimberMark?: () => void;
  readonly onAddRoadPermitTimberMark?: () => void;
}

export type CoastSubmissionDetailsReadOnlyProps = Omit<
  CoastSubmissionDetailsFormProps,
  'mode' | 'onAddSecondaryTimberMark' | 'onAddRoadPermitTimberMark'
>;

export const EMPTY_VALUES: CoastSubmissionDetailsValues = {
  primaryLoggingCompleteDate: '',
  harvestStatusCode: '',
  maturityCode: '',
  isHeliLogging: false,
  cableYardingAreaHa: '',
  groundBasedAreaHa: '',
  skylineLoggingAreaHa: '',
  wasteBenchmark: '',
  hasDispersedRetention: false,
  dispersedRetentionPct: '',
  dispersedRetentionExplanation: '',
  districtAverageCriteriaCodes: [],
  secondaryTimberMarks: [],
  roadPermitTimberMarks: [],
};

type TimberMarkLike = string | { mark?: string | null; timberMark?: string | null };

const toTimberMarkStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const mark = (item as { mark?: unknown }).mark;
        const timberMark = (item as { timberMark?: unknown }).timberMark;
        const resolved = mark ?? timberMark;
        return typeof resolved === 'string' ? resolved : '';
      }
      return '';
    })
    .filter((mark, index, arr) => !(mark === '' && index >= arr.length));
};

export const normalizeInitialValues = (
  initialValues?:
    | (Partial<CoastSubmissionDetailsValues> & {
        readonly districtAverageCriteriaCode?: string;
        readonly secondaryTimberMarks?: readonly TimberMarkLike[];
        readonly roadPermitTimberMarks?: readonly TimberMarkLike[];
      })
    | undefined,
): CoastSubmissionDetailsValues => {
  if (!initialValues) return EMPTY_VALUES;
  const legacy = initialValues.districtAverageCriteriaCode;
  const codes =
    initialValues.districtAverageCriteriaCodes ??
    (legacy ? [legacy] : EMPTY_VALUES.districtAverageCriteriaCodes);
  const { districtAverageCriteriaCode: _legacy, ...rest } = initialValues as Record<
    string,
    unknown
  >;
  return {
    ...EMPTY_VALUES,
    ...(rest as Partial<CoastSubmissionDetailsValues>),
    districtAverageCriteriaCodes: codes,
    secondaryTimberMarks: toTimberMarkStrings(rest.secondaryTimberMarks),
    roadPermitTimberMarks: toTimberMarkStrings(rest.roadPermitTimberMarks),
  };
};

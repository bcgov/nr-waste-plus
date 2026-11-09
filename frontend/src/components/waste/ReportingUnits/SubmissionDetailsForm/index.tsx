import { type FC } from 'react';

import CoastSubmissionDetailsForm from '@/components/waste/ReportingUnits/CoastSubmissionDetailsForm';
import InteriorSubmissionDetailsForm from '@/components/waste/ReportingUnits/InteriorSubmissionDetailsForm';

import type { CoastSubmissionDetailsValues } from '@/components/waste/ReportingUnits/CoastSubmissionDetailsForm';
import type {
  InteriorBecSubzoneVariantOption,
  InteriorSubmissionDetailsValues,
} from '@/components/waste/ReportingUnits/InteriorSubmissionDetailsForm';
import type { CodeDescriptionDto } from '@/types/search.types';

/** Which submission-details twin renders. Driven by the reporting-unit grade (plan D3). */
export type SubmissionVariant = 'interior' | 'coast';

/**
 * Grade shape needed for variant resolution — satisfied by the reporting-unit
 * details `grade` field (`code`/`description`, both nullable).
 */
type GradeLike = Pick<CodeDescriptionDto, 'code' | 'description'> | null | undefined;

/**
 * Resolves the submission-details variant from the reporting-unit grade.
 *
 * Coast is matched on the grade description (case- and whitespace-insensitive)
 * because the grade code domain is not settled yet (stub data uses `G1`, tests
 * use `IN`). Anything else — including no grade — falls back to interior, which
 * matches today's population (units without a grade are legacy-only).
 *
 * @param grade - The reporting-unit grade code/description, if available.
 * @returns `coast` for Coast grades, `interior` otherwise.
 */
export const resolveSubmissionVariant = (grade: GradeLike): SubmissionVariant =>
  grade?.description?.trim().toLowerCase() === 'coast' ? 'coast' : 'interior';

/**
 * Props for the variant-dispatching {@link SubmissionDetailsForm}. Option lists
 * for both variants are accepted; each twin consumes only its own.
 */
export interface SubmissionDetailsFormProps {
  /** Which variant twin renders. */
  readonly variant: SubmissionVariant;
  /** `form` renders editable controls; `read-only` renders values without edit affordances. */
  readonly mode: 'form' | 'read-only';
  /** Seed values; each twin reads the fields it owns. */
  readonly initialValues?: Partial<InteriorSubmissionDetailsValues & CoastSubmissionDetailsValues>;
  /** Harvest-status options shared by both variants. */
  readonly harvestStatuses: readonly CodeDescriptionDto[];
  /** Interior-only BEC zone options. */
  readonly becZones: readonly CodeDescriptionDto[];
  /** Interior-only BEC subzone/variant options, filtered client-side by chosen zone. */
  readonly becSubzoneVariants: readonly InteriorBecSubzoneVariantOption[];
  /** Coast-only maturity options. */
  readonly maturityOptions: readonly CodeDescriptionDto[];
  /** District-average criteria options (single select per D14). */
  readonly districtAverageCriteria: readonly CodeDescriptionDto[];
  /** Called when the Add secondary timber mark link is clicked. */
  readonly onAddSecondaryTimberMark?: () => void;
  /** Called when the Add road permit timber mark link is clicked. */
  readonly onAddRoadPermitTimberMark?: () => void;
}

/**
 * Swap-pattern seam for the Block details first tab (plan D3): renders the
 * Interior or Coast submission-details twin selected by {@link SubmissionVariant}.
 * The twins own the form/read-only dimension through their `mode` prop.
 *
 * @param props - Variant, mode, seed values, option lists, and mark callbacks.
 * @returns The selected submission-details twin.
 */
const SubmissionDetailsForm: FC<SubmissionDetailsFormProps> = ({
  variant,
  mode,
  initialValues,
  harvestStatuses,
  becZones,
  becSubzoneVariants,
  maturityOptions,
  districtAverageCriteria,
  onAddSecondaryTimberMark,
  onAddRoadPermitTimberMark,
}) => {
  if (variant === 'coast') {
    return (
      <CoastSubmissionDetailsForm
        mode={mode}
        initialValues={initialValues}
        harvestStatuses={harvestStatuses}
        maturityOptions={maturityOptions}
        districtAverageCriteria={districtAverageCriteria}
        onAddSecondaryTimberMark={onAddSecondaryTimberMark}
        onAddRoadPermitTimberMark={onAddRoadPermitTimberMark}
      />
    );
  }

  return (
    <InteriorSubmissionDetailsForm
      mode={mode}
      initialValues={initialValues}
      harvestStatuses={harvestStatuses}
      becZones={becZones}
      becSubzoneVariants={becSubzoneVariants}
      districtAverageCriteria={districtAverageCriteria}
      onAddSecondaryTimberMark={onAddSecondaryTimberMark}
      onAddRoadPermitTimberMark={onAddRoadPermitTimberMark}
    />
  );
};

export default SubmissionDetailsForm;

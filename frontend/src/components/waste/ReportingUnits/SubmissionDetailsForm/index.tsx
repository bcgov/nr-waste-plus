import { type FC } from 'react';

import CoastSubmissionDetailsForm from '@/components/waste/ReportingUnits/CoastSubmissionDetailsForm';
import InteriorSubmissionDetailsForm from '@/components/waste/ReportingUnits/InteriorSubmissionDetailsForm';

import type { CoastSubmissionDetailsValues } from '@/components/waste/ReportingUnits/CoastSubmissionDetailsForm';
import type {
  InteriorBecSubzoneVariantOption,
  InteriorSubmissionDetailsValues,
} from '@/components/waste/ReportingUnits/InteriorSubmissionDetailsForm';
import type { CodeDescriptionDto } from '@/types/search.types';

import type { SubmissionVariant } from '@/components/waste/ReportingUnits/BlockDetailsTab';

export { resolveSubmissionVariant } from '@/components/waste/ReportingUnits/BlockDetailsTab';
export type { SubmissionVariant };

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

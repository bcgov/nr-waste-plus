import { type FC } from 'react';

import CoastSubmissionDetailsForm from './variants/coast';
import InteriorSubmissionDetailsForm from './variants/interior';

import type { CoastSubmissionDetailsValues } from './variants/coast';
import type { SubmissionVariant } from '../../resolveSubmissionVariant';
import type {
  InteriorBecSubzoneVariantOption,
  InteriorSubmissionDetailsValues,
} from './variants/interior/types';
import type { CodeDescriptionDto } from '@/types/search.types';

/**
 * Props for the Submission details card (card 1, D20). Option lists for both variants
 * are accepted; each variant consumes only its own. Harvest-status options are supplied
 * per variant by the caller (BR-5/D33) — no FE seed.
 */
export interface SubmissionDetailsCardProps {
  readonly variant: SubmissionVariant;
  readonly mode: 'form' | 'read-only';
  readonly initialValues?: Partial<
    InteriorSubmissionDetailsValues & CoastSubmissionDetailsValues
  > & {
    readonly districtAverageCriteriaCode?: string;
  };
  readonly harvestStatuses: readonly CodeDescriptionDto[];
  readonly becZones: readonly CodeDescriptionDto[];
  readonly becSubzoneVariants: readonly InteriorBecSubzoneVariantOption[];
  readonly maturityOptions: readonly CodeDescriptionDto[];
  readonly districtAverageCriteria: readonly CodeDescriptionDto[];
  readonly onAddSecondaryTimberMark?: () => void;
  readonly onAddRoadPermitTimberMark?: () => void;
}

/**
 * Card 1 — Submission details (D20 tier 1+2+3 composition). Resolves the Interior or
 * Coast variant; shared validators/helpers live in `./shared` and the variant field
 * groups/row order live under `./variants`.
 */
const SubmissionDetailsCard: FC<SubmissionDetailsCardProps> = ({
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

export default SubmissionDetailsCard;

import { type FC } from 'react';

import SubmissionDetailsCard from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard';

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
 * Back-compat props for the variant-dispatching submission-details form.
 * Delegates to {@link SubmissionDetailsCard}.
 */
export interface SubmissionDetailsFormProps {
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
 * Back-compat shim (D20/S3b): implementation moved to BlockDetailsTab card.
 */
const SubmissionDetailsForm: FC<SubmissionDetailsFormProps> = (props) => (
  <SubmissionDetailsCard {...props} />
);

export default SubmissionDetailsForm;

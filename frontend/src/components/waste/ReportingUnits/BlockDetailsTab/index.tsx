import { type FC } from 'react';

import SubmissionDetailsCard, {
  type SubmissionDetailsCardProps,
} from './cards/SubmissionDetailsCard';
import WasteAssessmentAreaSummaryCard from './cards/WasteAssessmentAreaSummaryCard';
import DistrictAverageVolumesSummaryCard from './cards/DistrictAverageVolumesSummaryCard';
import AdditionalRequirementsCard from './cards/AdditionalRequirementsCard';
import { resolveSubmissionVariant, type SubmissionVariant } from './resolveSubmissionVariant';

import type { CodeDescriptionDto } from '@/types/search.types';

export { resolveSubmissionVariant, type SubmissionVariant };

export interface BlockDetailsTabProps extends Omit<SubmissionDetailsCardProps, 'variant'> {
  /** Reporting-unit grade used to resolve the submission-details variant (D3/D20). */
  readonly grade?: Pick<CodeDescriptionDto, 'code' | 'description'> | null;
  /** Optional override for the resolved variant. */
  readonly variant?: SubmissionVariant;
  /** Navigate to another block-details tab (S7 card buttons). */
  readonly onNavigateTab?: (tabIndex: number) => void;
}

/**
 * Block Details tab content (D20 tier 1). Resolves the submission-details variant and
 * composes card 1 (Submission details) plus the variant-identical cards 2–4 slots
 * (S7/S8 fill content). The page owns the 5-tab frame; this component owns tab-1 card
 * composition.
 */
const BlockDetailsTab: FC<BlockDetailsTabProps> = ({
  grade,
  variant,
  onNavigateTab: _onNavigateTab,
  ...cardProps
}) => {
  const resolvedVariant = variant ?? resolveSubmissionVariant(grade);
  return (
    <>
      <SubmissionDetailsCard {...cardProps} variant={resolvedVariant} />
      <WasteAssessmentAreaSummaryCard />
      <DistrictAverageVolumesSummaryCard />
      <AdditionalRequirementsCard />
    </>
  );
};

export default BlockDetailsTab;

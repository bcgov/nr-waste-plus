import { type FC } from 'react';

import SubmissionDetailsCard, {
  type SubmissionDetailsCardProps,
} from './cards/SubmissionDetailsCard';
import WasteAssessmentAreaSummaryCard, {
  type WasteAssessmentAreaSummaryCardProps,
} from './cards/WasteAssessmentAreaSummaryCard';
import DistrictAverageVolumesSummaryCard, {
  type DistrictAverageVolumesSummaryCardProps,
} from './cards/DistrictAverageVolumesSummaryCard';
import AdditionalRequirementsCard, {
  type AdditionalRequirementsCardProps,
} from './cards/AdditionalRequirementsCard';
import { resolveSubmissionVariant, type SubmissionVariant } from './resolveSubmissionVariant';

import type { CodeDescriptionDto } from '@/types/search.types';

import './index.scss';

export { resolveSubmissionVariant, type SubmissionVariant };

export interface BlockDetailsTabProps extends Omit<SubmissionDetailsCardProps, 'variant'> {
  /** Reporting-unit grade used to resolve the submission-details variant (D3/D20). */
  readonly grade?: Pick<CodeDescriptionDto, 'code' | 'description'> | null;
  /** Optional override for the resolved variant. */
  readonly variant?: SubmissionVariant;
  /** Navigate to another block-details tab (S7 controlled tabs). */
  readonly onNavigateTab?: (tabIndex: number) => void;
  /** Card 4 — Additional requirements (S8/D11). `mode` is forwarded from the tab when omitted. */
  readonly additionalRequirements?: Omit<AdditionalRequirementsCardProps, 'mode'> & {
    readonly mode?: AdditionalRequirementsCardProps['mode'];
  };
  /** Card 2 — Waste assessment area summary (S7). */
  readonly wasteAssessmentArea?: Omit<WasteAssessmentAreaSummaryCardProps, 'onGoToAreaCalculator'>;
  /** Card 3 — District average volumes summary (S7). */
  readonly districtAverageVolumes?: Omit<
    DistrictAverageVolumesSummaryCardProps,
    'onViewVolumeDetails' | 'mode'
  >;
}

/**
 * Block Details tab content (D20 tier 1). Resolves the submission-details variant and
 * composes card 1 (Submission details) plus the variant-identical cards 2–4
 * (S7/S8). The page owns the 5-tab frame; this component owns tab-1 card composition.
 */
const BlockDetailsTab: FC<BlockDetailsTabProps> = ({
  grade,
  variant,
  onNavigateTab,
  additionalRequirements,
  wasteAssessmentArea,
  districtAverageVolumes,
  ...cardProps
}) => {
  const resolvedVariant = variant ?? resolveSubmissionVariant(grade);
  return (
    <div className="block-details-tab">
      <SubmissionDetailsCard {...cardProps} variant={resolvedVariant} />
      <WasteAssessmentAreaSummaryCard
        {...wasteAssessmentArea}
        onGoToAreaCalculator={() => onNavigateTab?.(1)}
      />
      <DistrictAverageVolumesSummaryCard
        mode={cardProps.mode}
        {...districtAverageVolumes}
        onViewVolumeDetails={() => onNavigateTab?.(2)}
      />
      <AdditionalRequirementsCard
        mode={cardProps.mode}
        {...additionalRequirements}
        onAddAttachments={additionalRequirements?.onAddAttachments ?? (() => onNavigateTab?.(3))}
      />
    </div>
  );
};

export default BlockDetailsTab;

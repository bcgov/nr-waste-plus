import type { FC } from 'react';
import type { CodeDescriptionDto } from '@/types/search.types';

export type SubmissionVariant = 'interior' | 'coast';

export interface SubmissionDetailsCardProps {
  readonly variant: SubmissionVariant;
  readonly mode: 'form' | 'read-only';
  readonly initialValues?: Record<string, unknown>;
  readonly harvestStatuses: readonly CodeDescriptionDto[];
  readonly becZones: readonly CodeDescriptionDto[];
  readonly becSubzoneVariants: readonly unknown[];
  readonly maturityOptions: readonly CodeDescriptionDto[];
  readonly districtAverageCriteria: readonly CodeDescriptionDto[];
  readonly onAddSecondaryTimberMark?: () => void;
  readonly onAddRoadPermitTimberMark?: () => void;
}

const SubmissionDetailsCard: FC<SubmissionDetailsCardProps> = () => (
  <section aria-label="Submission details">Submission details (stub)</section>
);

export default SubmissionDetailsCard;

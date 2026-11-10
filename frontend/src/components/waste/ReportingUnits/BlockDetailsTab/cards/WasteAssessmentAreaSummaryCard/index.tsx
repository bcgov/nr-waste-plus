import type { FC } from 'react';

export type WasteAssessmentAreaRow = {
  markType?: string | null;
  timberMarkId?: string | null;
  netWasteAreaHa?: string | number | null;
};

export type WasteAssessmentAreaSummaryCardProps = {
  rows?: readonly WasteAssessmentAreaRow[];
  totalNetWasteAreaHa?: string | number | null;
  onGoToAreaCalculator?: () => void;
};

const WasteAssessmentAreaSummaryCard: FC<WasteAssessmentAreaSummaryCardProps> = () => (
  <section aria-label="Waste assessment area summary">Waste assessment area summary (stub)</section>
);

export default WasteAssessmentAreaSummaryCard;

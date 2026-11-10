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

const WasteAssessmentAreaSummaryCard: FC<WasteAssessmentAreaSummaryCardProps> = ({
  rows,
  totalNetWasteAreaHa,
  onGoToAreaCalculator,
}) => {
  void rows;
  void totalNetWasteAreaHa;

  return (
    <section aria-label="Waste assessment area summary">
      <button type="button" onClick={onGoToAreaCalculator}>
        Go to area calculator
      </button>
    </section>
  );
};

export default WasteAssessmentAreaSummaryCard;

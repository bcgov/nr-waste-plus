import {
  Button,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { type FC } from 'react';

import './index.scss';

export type WasteAssessmentAreaRow = {
  markType?: string | null;
  timberMarkId?: string | null;
  netWasteAreaHa?: string | number | null;
};

export type WasteAssessmentAreaSummaryCardProps = {
  rows?: readonly WasteAssessmentAreaRow[];
  totalNetWasteAreaHa?: string | number | null;
  /** Navigates to Area calculator tab (index 1). */
  onGoToAreaCalculator?: () => void;
};

const display = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '--';
  return String(value);
};

/**
 * Card 2 — Waste assessment area summary (D20 tier 1, S7, variant-identical, Figma 1:7425).
 * Renders supplied rows/totals as received (empty-safe, dashes for empties).
 * Data source is the Area calculator (tab 2); recalculation deferred (OQD).
 */
const WasteAssessmentAreaSummaryCard: FC<WasteAssessmentAreaSummaryCardProps> = ({
  rows = [],
  totalNetWasteAreaHa,
  onGoToAreaCalculator,
}) => (
  <section
    className="waste-assessment-area-summary-card"
    aria-labelledby="waste-assessment-area-summary-heading"
  >
    <div className="waste-assessment-area-summary-card__header">
      <div className="waste-assessment-area-summary-card__title-block">
        <h3
          id="waste-assessment-area-summary-heading"
          className="waste-assessment-area-summary-card__heading"
        >
          Waste assessment area summary
        </h3>
        <p className="waste-assessment-area-summary-card__helper">
          Use area calculator to add waste assessment area details
        </p>
      </div>
      <Button
        kind="tertiary"
        className="waste-assessment-area-summary-card__action"
        onClick={onGoToAreaCalculator}
      >
        Go to area calculator
      </Button>
    </div>
    <StructuredListWrapper
      aria-label="Waste assessment area summary"
      className="waste-assessment-area-summary-card__list"
    >
      <StructuredListHead>
        <StructuredListRow head>
          <StructuredListCell head>Timber mark type</StructuredListCell>
          <StructuredListCell head>Timber mark ID</StructuredListCell>
          <StructuredListCell head>Net waste area (ha)</StructuredListCell>
        </StructuredListRow>
      </StructuredListHead>
      <StructuredListBody>
        {rows.map((row, index) => (
          <StructuredListRow key={`${row.timberMarkId ?? 'row'}-${index}`}>
            <StructuredListCell>{display(row.markType)}</StructuredListCell>
            <StructuredListCell>{display(row.timberMarkId)}</StructuredListCell>
            <StructuredListCell>{display(row.netWasteAreaHa)}</StructuredListCell>
          </StructuredListRow>
        ))}
        <StructuredListRow>
          <StructuredListCell>
            <strong>Total net waste area (ha)</strong>
          </StructuredListCell>
          <StructuredListCell />
          <StructuredListCell>
            <strong>{display(totalNetWasteAreaHa ?? (rows.length ? undefined : '0.0'))}</strong>
          </StructuredListCell>
        </StructuredListRow>
      </StructuredListBody>
    </StructuredListWrapper>
  </section>
);

export default WasteAssessmentAreaSummaryCard;

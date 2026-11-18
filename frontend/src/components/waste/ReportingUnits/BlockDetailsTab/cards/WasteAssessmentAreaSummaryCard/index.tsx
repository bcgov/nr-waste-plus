import {
  Button,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';

import type { FC } from 'react';

import './index.scss';

export type WasteAssessmentAreaMark = {
  timberMarkId?: string | null;
  netWasteAreaHa?: string | number | null;
};

export type WasteAssessmentAreaRow = {
  markType?: string | null;
  timberMarkId?: string | null;
  netWasteAreaHa?: string | number | null;
};

export type WasteAssessmentAreaSummaryCardProps = {
  primary?: WasteAssessmentAreaMark | null;
  secondary?: readonly WasteAssessmentAreaMark[] | null;
  totalNetWasteAreaHa?: string | number | null;
  onGoToAreaCalculator?: () => void;
};

const toDisplayValue = (value?: string | number | null): string => {
  if (value === null || value === undefined) return '-';
  const stringValue = String(value);
  return stringValue.trim() === '' ? '-' : stringValue;
};

/**
 * Displays the waste assessment area summary (primary/secondary timber marks and
 * backend-precomputed total net waste area). Renders missing values as `-` and
 * never injects hardcoded placeholder marks.
 */
const WasteAssessmentAreaSummaryCard: FC<WasteAssessmentAreaSummaryCardProps> = ({
  primary,
  secondary,
  totalNetWasteAreaHa,
  onGoToAreaCalculator,
}) => {
  const displayRows: WasteAssessmentAreaRow[] = [];

  if (primary) {
    displayRows.push({
      markType: 'Primary mark',
      timberMarkId: primary.timberMarkId,
      netWasteAreaHa: primary.netWasteAreaHa,
    });
  }

  for (const mark of secondary ?? []) {
    displayRows.push({
      markType: 'Secondary mark',
      timberMarkId: mark.timberMarkId,
      netWasteAreaHa: mark.netWasteAreaHa,
    });
  }

  const total = toDisplayValue(totalNetWasteAreaHa);

  return (
    <section
      className="waste-assessment-area-summary-card"
      aria-label="Waste assessment area summary"
    >
      <div className="waste-assessment-area-summary-card__header">
        <div className="waste-assessment-area-summary-card__title-group">
          <h2 className="waste-assessment-area-summary-card__title">
            Waste assessment area summary
          </h2>
          <p className="waste-assessment-area-summary-card__helper">
            Use area calculator to add waste assessment area details
          </p>
        </div>
        <Button
          kind="secondary"
          className="waste-assessment-area-summary-card__button"
          onClick={onGoToAreaCalculator}
        >
          Go to area calculator
        </Button>
      </div>

      <StructuredListWrapper
        isCondensed
        selection={false}
        className="waste-assessment-area-summary-card__table"
        aria-label="Waste assessment area summary table"
      >
        <StructuredListHead>
          <StructuredListRow head>
            <StructuredListCell head>Timber mark type</StructuredListCell>
            <StructuredListCell head>Timber mark ID</StructuredListCell>
            <StructuredListCell head>Net waste area (ha)</StructuredListCell>
          </StructuredListRow>
        </StructuredListHead>
        <StructuredListBody>
          {displayRows.map((row, index) => (
            <StructuredListRow
              key={`${index}-${row.markType ?? 'row'}-${row.timberMarkId ?? 'mark'}`}
            >
              <StructuredListCell>{toDisplayValue(row.markType)}</StructuredListCell>
              <StructuredListCell>{toDisplayValue(row.timberMarkId)}</StructuredListCell>
              <StructuredListCell>{toDisplayValue(row.netWasteAreaHa)}</StructuredListCell>
            </StructuredListRow>
          ))}
          <StructuredListRow>
            <StructuredListCell className="waste-assessment-area-summary-card__total-cell">
              Total net waste area (ha)
            </StructuredListCell>
            <StructuredListCell />
            <StructuredListCell className="waste-assessment-area-summary-card__total-cell">
              {total}
            </StructuredListCell>
          </StructuredListRow>
        </StructuredListBody>
      </StructuredListWrapper>
    </section>
  );
};

export default WasteAssessmentAreaSummaryCard;

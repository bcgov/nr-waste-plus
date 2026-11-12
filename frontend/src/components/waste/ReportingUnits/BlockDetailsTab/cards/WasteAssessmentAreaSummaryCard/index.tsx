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

const toDisplayValue = (value?: string | number | null): string => {
  if (value === null || value === undefined) return '-';
  const stringValue = String(value);
  return stringValue.trim() === '' ? '-' : stringValue;
};

const WasteAssessmentAreaSummaryCard: FC<WasteAssessmentAreaSummaryCardProps> = ({
  rows,
  totalNetWasteAreaHa,
  onGoToAreaCalculator,
}) => {
  // Temporary hardcoded primary mark row (S7) until area-calculator data is wired.
  const primaryMarkRow: WasteAssessmentAreaRow = {
    markType: 'Primary mark',
    timberMarkId: '74/1AD',
    netWasteAreaHa: '-',
  };

  const displayRows = [primaryMarkRow, ...(rows ?? [])];
  const total = toDisplayValue(totalNetWasteAreaHa === undefined ? '0.0' : totalNetWasteAreaHa);

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

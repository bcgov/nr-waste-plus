import {
  Button,
  Column,
  Grid,
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
      <Grid className="detail-header-grid waste-assessment-area-summary-card__header-grid">
        <Column lg={8} md={8} sm={4} className="waste-assessment-area-summary-card__title-column">
          <h2 className="waste-assessment-area-summary-card__title">
            Waste assessment area summary
          </h2>
          <p className="waste-assessment-area-summary-card__helper">
            Use area calculator to add waste assessment area details
          </p>
        </Column>
        <Column lg={8} md={8} sm={4} className="waste-assessment-area-summary-card__action-column">
          <Button
            kind="tertiary"
            size="md"
            className="waste-assessment-area-summary-card__button"
            onClick={onGoToAreaCalculator}
          >
            Go to area calculator
          </Button>
        </Column>
      </Grid>

      <Grid className="detail-header-grid waste-assessment-area-summary-card__table-grid">
        <Column lg={8} md={8} sm={4} className="waste-assessment-area-summary-card__table-column">
          <div className="waste-assessment-area-summary-card__table-scroll">
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
                <StructuredListRow className="waste-assessment-area-summary-card__total-row">
                  <StructuredListCell className="waste-assessment-area-summary-card__total-label">
                    Total net waste area (ha)
                  </StructuredListCell>
                  <StructuredListCell />
                  <StructuredListCell className="waste-assessment-area-summary-card__total-value">
                    {total}
                  </StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
            </StructuredListWrapper>
          </div>
        </Column>
      </Grid>
    </section>
  );
};

export default WasteAssessmentAreaSummaryCard;

import {
  Button,
  Dropdown,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import type { FC } from 'react';

import type { CodeDescriptionDto } from '@/types/search.types';

import './index.scss';

export type DistrictAverageVolumeRow = {
  populationType?: string | null;
  wasteType?: string | null;
  harvestMethodCode?: string | null;
  assessmentMethod?: string | null;
  wasteLevel?: string | null;
  netWasteAreaHa?: string | number | null;
  totalBillableVolumeM3?: string | number | null;
  totalCutControlVolumeM3?: string | number | null;
};

export type DistrictAverageVolumesSummaryCardProps = {
  rows?: readonly DistrictAverageVolumeRow[];
  totals?: {
    totalBillableVolumeM3?: string | number | null;
    totalCutControlVolumeM3?: string | number | null;
  };
  harvestMethodOptions?: readonly CodeDescriptionDto[];
  onHarvestMethodChange?: (index: number, code: string) => void;
  mode?: 'form' | 'read-only';
  onViewVolumeDetails?: () => void;
};

const toDisplayValue = (value?: string | number | null): string => {
  if (value === null || value === undefined) return '-';
  const stringValue = String(value);
  return stringValue.trim() === '' ? '-' : stringValue;
};

const getHarvestMethodLabel = (
  code: string | null | undefined,
  options?: readonly CodeDescriptionDto[],
): string => {
  if (!code) return '-';
  const match = options?.find((option) => option.code === code);
  return toDisplayValue(match?.description ?? match?.code ?? code);
};

const DistrictAverageVolumesSummaryCard: FC<DistrictAverageVolumesSummaryCardProps> = ({
  rows = [],
  totals,
  harvestMethodOptions = [],
  onHarvestMethodChange,
  mode = 'form',
  onViewVolumeDetails,
}) => {
  const isReadOnly = mode === 'read-only';

  return (
    <section
      className="district-average-volumes-summary-card"
      aria-label="District average volumes summary"
    >
      <div className="district-average-volumes-summary-card__header">
        <div className="district-average-volumes-summary-card__title-group">
          <h2 className="district-average-volumes-summary-card__title">
            District average volumes summary
          </h2>
          <p className="district-average-volumes-summary-card__helper">
            Estimated volumes are auto-calculated and may differ from final volumes
          </p>
        </div>
        <Button
          kind="secondary"
          className="district-average-volumes-summary-card__button"
          onClick={onViewVolumeDetails}
        >
          View volume details
        </Button>
      </div>

      <StructuredListWrapper
        isCondensed
        selection={false}
        className="district-average-volumes-summary-card__table"
        aria-label="District average volumes summary table"
      >
        <StructuredListHead>
          <StructuredListRow head>
            <StructuredListCell head>Population type</StructuredListCell>
            <StructuredListCell head>Waste type</StructuredListCell>
            <StructuredListCell head>Harvest method</StructuredListCell>
            <StructuredListCell head>Assessment method</StructuredListCell>
            <StructuredListCell head>Waste level</StructuredListCell>
            <StructuredListCell head>Net waste area (ha)</StructuredListCell>
            <StructuredListCell head>Total billable volume (m³)</StructuredListCell>
            <StructuredListCell head>Total cut control volume (m³)</StructuredListCell>
          </StructuredListRow>
        </StructuredListHead>
        <StructuredListBody>
          {rows.map((row, index) => {
            const selectedItem =
              harvestMethodOptions.find((option) => option.code === row.harvestMethodCode) ?? null;

            return (
              <StructuredListRow key={index}>
                <StructuredListCell>{toDisplayValue(row.populationType)}</StructuredListCell>
                <StructuredListCell>{toDisplayValue(row.wasteType)}</StructuredListCell>
                <StructuredListCell className="district-average-volumes-summary-card__harvest-method-cell">
                  {isReadOnly ? (
                    getHarvestMethodLabel(row.harvestMethodCode, harvestMethodOptions)
                  ) : (
                    <Dropdown
                      id={`district-average-harvest-method-${index}`}
                      titleText="Harvest method"
                      hideLabel
                      label="Select one"
                      items={[...harvestMethodOptions]}
                      itemToString={(item: CodeDescriptionDto | null) =>
                        item?.description ?? item?.code ?? ''
                      }
                      selectedItem={selectedItem}
                      onChange={({ selectedItem: next }) => {
                        if (next?.code) {
                          onHarvestMethodChange?.(index, next.code);
                        }
                      }}
                      size="sm"
                    />
                  )}
                </StructuredListCell>
                <StructuredListCell>{toDisplayValue(row.assessmentMethod)}</StructuredListCell>
                <StructuredListCell>{toDisplayValue(row.wasteLevel)}</StructuredListCell>
                <StructuredListCell>{toDisplayValue(row.netWasteAreaHa)}</StructuredListCell>
                <StructuredListCell>{toDisplayValue(row.totalBillableVolumeM3)}</StructuredListCell>
                <StructuredListCell>
                  {toDisplayValue(row.totalCutControlVolumeM3)}
                </StructuredListCell>
              </StructuredListRow>
            );
          })}
          <StructuredListRow>
            <StructuredListCell className="district-average-volumes-summary-card__total-cell">
              Total
            </StructuredListCell>
            <StructuredListCell />
            <StructuredListCell />
            <StructuredListCell />
            <StructuredListCell />
            <StructuredListCell />
            <StructuredListCell className="district-average-volumes-summary-card__total-cell">
              {toDisplayValue(totals?.totalBillableVolumeM3)}
            </StructuredListCell>
            <StructuredListCell className="district-average-volumes-summary-card__total-cell">
              {toDisplayValue(totals?.totalCutControlVolumeM3)}
            </StructuredListCell>
          </StructuredListRow>
        </StructuredListBody>
      </StructuredListWrapper>
    </section>
  );
};

export default DistrictAverageVolumesSummaryCard;

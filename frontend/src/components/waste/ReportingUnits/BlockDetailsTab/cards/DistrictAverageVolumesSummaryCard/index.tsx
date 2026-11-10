import {
  Button,
  Dropdown,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { type FC } from 'react';

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

export type DistrictAverageVolumeTotals = {
  netWasteAreaHa?: string | number | null;
  totalBillableVolumeM3?: string | number | null;
  totalCutControlVolumeM3?: string | number | null;
};

export type DistrictAverageVolumesSummaryCardProps = {
  rows?: readonly DistrictAverageVolumeRow[];
  totals?: DistrictAverageVolumeTotals;
  /** Harvest method options (legacy Waste list / API). D12: no FE seed; empty-safe. */
  harvestMethodOptions?: readonly CodeDescriptionDto[];
  /** Harvest method change (recalculation deferred, OQD). */
  onHarvestMethodChange?: (rowIndex: number, code: string) => void;
  /** Navigates to Waste volumes tab (index 2). */
  onViewVolumeDetails?: () => void;
  mode?: 'form' | 'read-only';
};

const display = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '--';
  return String(value);
};

/**
 * Card 3 — District average volumes summary (D20 tier 1, S7, variant-identical, Figma 1:7464).
 * 8 columns; D8 fixed values rendered as received. Only Harvest method is editable
 * (inline dropdown); recalculation semantics deferred (OQD).
 */
const DistrictAverageVolumesSummaryCard: FC<DistrictAverageVolumesSummaryCardProps> = ({
  rows = [],
  totals,
  harvestMethodOptions = [],
  onHarvestMethodChange,
  onViewVolumeDetails,
  mode = 'form',
}) => (
  <section
    className="district-average-volumes-summary-card"
    aria-labelledby="district-average-volumes-summary-heading"
  >
    <div className="district-average-volumes-summary-card__header">
      <div>
        <h3
          id="district-average-volumes-summary-heading"
          className="district-average-volumes-summary-card__heading"
        >
          District average volumes summary
        </h3>
        <p className="district-average-volumes-summary-card__helper">
          Estimated volumes are auto-calculated and may differ from final volumes
        </p>
      </div>
      <Button kind="tertiary" onClick={onViewVolumeDetails}>
        View volume details
      </Button>
    </div>
    <StructuredListWrapper
      aria-label="District average volumes summary"
      className="district-average-volumes-summary-card__list"
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
          const selected =
            harvestMethodOptions.find((o) => o.code === row.harvestMethodCode) ?? null;
          return (
            <StructuredListRow key={index}>
              <StructuredListCell>{display(row.populationType)}</StructuredListCell>
              <StructuredListCell>{display(row.wasteType)}</StructuredListCell>
              <StructuredListCell>
                {mode === 'read-only' || !onHarvestMethodChange ? (
                  display(selected?.description ?? row.harvestMethodCode)
                ) : (
                  <Dropdown
                    id={`harvest-method-${index}`}
                    label="Select one"
                    titleText=""
                    hideLabel
                    items={[...harvestMethodOptions]}
                    itemToString={(item) => item?.description ?? ''}
                    selectedItem={selected}
                    onChange={({ selectedItem }) =>
                      onHarvestMethodChange(index, selectedItem?.code ?? '')
                    }
                  />
                )}
              </StructuredListCell>
              <StructuredListCell>{display(row.assessmentMethod)}</StructuredListCell>
              <StructuredListCell>{display(row.wasteLevel)}</StructuredListCell>
              <StructuredListCell>{display(row.netWasteAreaHa)}</StructuredListCell>
              <StructuredListCell>{display(row.totalBillableVolumeM3)}</StructuredListCell>
              <StructuredListCell>{display(row.totalCutControlVolumeM3)}</StructuredListCell>
            </StructuredListRow>
          );
        })}
        <StructuredListRow>
          <StructuredListCell>
            <strong>Total</strong>
          </StructuredListCell>
          <StructuredListCell />
          <StructuredListCell />
          <StructuredListCell />
          <StructuredListCell />
          <StructuredListCell>
            <strong>{display(totals?.netWasteAreaHa)}</strong>
          </StructuredListCell>
          <StructuredListCell>
            <strong>{display(totals?.totalBillableVolumeM3)}</strong>
          </StructuredListCell>
          <StructuredListCell>
            <strong>{display(totals?.totalCutControlVolumeM3)}</strong>
          </StructuredListCell>
        </StructuredListRow>
      </StructuredListBody>
    </StructuredListWrapper>
  </section>
);

export default DistrictAverageVolumesSummaryCard;

import type { FC } from 'react';
import type { CodeDescriptionDto } from '@/types/search.types';

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
  totals?: { totalBillableVolumeM3?: string | number | null; totalCutControlVolumeM3?: string | number | null };
  harvestMethodOptions?: readonly CodeDescriptionDto[];
  onHarvestMethodChange?: (index: number, code: string) => void;
  mode?: 'form' | 'read-only';
  onViewVolumeDetails?: () => void;
};

const DistrictAverageVolumesSummaryCard: FC<DistrictAverageVolumesSummaryCardProps> = () => (
  <section aria-label="District average volumes summary">District average volumes summary (stub)</section>
);

export default DistrictAverageVolumesSummaryCard;

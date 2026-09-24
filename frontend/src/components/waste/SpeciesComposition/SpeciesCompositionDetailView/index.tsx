import { type FC } from 'react';

import SpeciesCompositionDetailHeader from './SpeciesCompositionDetailHeader.tsx';
import SpeciesCompositionDetailMatrix from './SpeciesCompositionDetailMatrix.tsx';

import PageNotification from '@/components/core/PageNotification';
import {
  speciesCompositionDataSchema,
  type SpeciesCompositionDetail,
} from '@/services/speciesComposition.types.ts';

/**
 * Props for the {@link SpeciesCompositionDetailView} component.
 */
interface SpeciesCompositionDetailViewProps {
  /** The species composition detail data. */
  readonly data: SpeciesCompositionDetail;
}

/**
 * Species Composition Detail View — displays metadata header and a district × species
 * composition matrix table.
 *
 * @param props - Component props.
 * @param props.data - The species composition detail data.
 * @returns The species composition detail view.
 */

const SpeciesCompositionDetailView: FC<SpeciesCompositionDetailViewProps> = ({ data }) => {
  const tableData = speciesCompositionDataSchema.safeParse(data?.tableData);

  return (
    <>
      {/* Metadata header */}
      <SpeciesCompositionDetailHeader
        startDate={data.startDate}
        endDate={data.endDate}
        uploadedBy={data.uploadedBy}
        dateOfUpload={data.dateOfUpload}
      />

      {/* Notification area */}
      <div className="species-composition-detail-column__notification">
        <PageNotification eventTarget="species-composition-detail" />
      </div>

      {/* Matrix table */}
      <SpeciesCompositionDetailMatrix rows={tableData.success ? tableData.data.rows : []} />
    </>
  );
};

export default SpeciesCompositionDetailView;

import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageNotification from '@/components/core/PageNotification';

import SpeciesCompositionDetailHeader from './SpeciesCompositionDetailHeader.tsx';
import SpeciesCompositionDetailMatrix from './SpeciesCompositionDetailMatrix.tsx';

import type { SpeciesCompositionDetail } from '@/types/speciesComposition.types.ts';

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
  return (
    <>
      {/* Metadata header */}
      <Column lg={16} md={8} sm={4}>
        <SpeciesCompositionDetailHeader
          startDate={data.startDate}
          endDate={data.endDate}
          uploadedBy={data.uploadedBy}
          dateOfUpload={data.dateOfUpload}
        />
      </Column>

      {/* Notification area */}
      <div className="species-composition-detail-column__notification">
        <PageNotification eventTarget="species-composition-detail" />
      </div>

      {/* Matrix table */}
      <SpeciesCompositionDetailMatrix rows={data.tableData.rows ?? []} />
    </>
  );
};

export default SpeciesCompositionDetailView;

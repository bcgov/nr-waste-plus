import { Column } from '@carbon/react';
import { type FC } from 'react';

import SpeciesCompositionDetailMatrix from './SpeciesCompositionDetailMatrix';

import type { SpeciesCompositionDetail } from '@/services/speciesComposition.types';

import PageNotification from '@/components/core/PageNotification';
import DateTag from '@/components/core/Tags/DateTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';

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
      <Column lg={16} md={8} sm={4} className="species-composition-detail__start-date">
        <ReadonlyInput label="Start date">
          {data.startDate && <DateTag date={data.startDate} format="MMMM dd, yyyy" />}
        </ReadonlyInput>
      </Column>

      {/* Notification area */}
      <div className="species-composition-detail-column__notification">
        <PageNotification eventTarget="species-composition-detail" />
      </div>

      {/* Matrix table */}
      <SpeciesCompositionDetailMatrix rows={data.tableData.rows} />
    </>
  );
};

export default SpeciesCompositionDetailView;

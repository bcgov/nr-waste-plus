import { Column } from '@carbon/react';
import { type FC } from 'react';

import DateTag from '@/components/core/Tags/DateTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';

/**
 * Props for the {@link SpeciesCompositionDetailHeader} component.
 */
interface SpeciesCompositionDetailHeaderProps {
  /** Start date of the species composition. */
  readonly startDate: string;
  /** End date (may be null). */
  readonly endDate: string | null;
  /** User who uploaded the data. */
  readonly uploadedBy: string;
  /** Timestamp of the upload. */
  readonly dateOfUpload: string;
}

/**
 * Renders the metadata header for a Species Composition Detail view.
 * Mirrors the layout used in the District Volume Detail header, but with the
 * fields specific to species composition.
 */
const SpeciesCompositionDetailHeader: FC<SpeciesCompositionDetailHeaderProps> = ({
  startDate,
  endDate,
  uploadedBy,
  dateOfUpload,
}) => {
  return (
    <>
      {/* Start date */}
      <Column lg={4} md={4} sm={4} className="species-composition-detail-column__start-date">
        <ReadonlyInput label="Start date">
          <DateTag date={startDate} format="MMMM dd, yyyy" />
        </ReadonlyInput>
      </Column>
      {/* End date */}
      <Column lg={4} md={4} sm={4} className="species-composition-detail-column__end-date">
        <ReadonlyInput label="End date">
          {endDate ? <DateTag date={endDate} format="MMMM dd, yyyy" /> : <span>TBD</span>}
        </ReadonlyInput>
      </Column>
      {/* Uploaded by */}
      <Column lg={4} md={4} sm={4} className="species-composition-detail-column__uploaded-by">
        <ReadonlyInput label="Uploaded by">{uploadedBy}</ReadonlyInput>
      </Column>
      {/* Date of upload */}
      <Column lg={4} md={4} sm={4} className="species-composition-detail-column__date-of-upload">
        <ReadonlyInput label="Date of upload">
          <DateTag date={dateOfUpload} format="MMMM dd, yyyy" />
        </ReadonlyInput>
      </Column>
    </>
  );
};

export default SpeciesCompositionDetailHeader;

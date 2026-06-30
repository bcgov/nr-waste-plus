import { Column } from '@carbon/react';
import { type FC } from 'react';

import DateTag from '@/components/core/Tags/DateTag';
import PrecisionNumberTag from '@/components/core/Tags/PrecisionNumberTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';

/**
 * Props for the {@link DistrictVolumeDetailHeader} component.
 */
interface DistrictVolumeDetailHeaderProps {
  /** The start date of the district volume. */
  readonly startDate: string;
  /** The end date of the district volume. */
  readonly endDate: string | null;
  /** The dispersed retention reduction factor. */
  readonly tableLevelFactor: number;
  /** The heli multiplier (optional, COASTAL only). */
  readonly heliMultiplier?: number;
}

/**
 * Renders the header fields for a District Volume Detail view.
 *
 * @param props - Component props.
 * @returns The header fields.
 */
const DistrictVolumeDetailHeader: FC<DistrictVolumeDetailHeaderProps> = ({
  startDate,
  endDate,
  tableLevelFactor,
  heliMultiplier,
}) => {
  return (
    <>
      <Column lg={4} md={4} sm={4} className="district-volume-detail__start-date">
        <ReadonlyInput label="Start date">
          {startDate && <DateTag date={startDate} format="MMMM dd, yyyy" />}
        </ReadonlyInput>
      </Column>
      <Column lg={12} md={4} sm={4} className="district-volume-detail__end-date">
        <ReadonlyInput label="End date">
          {endDate && <DateTag date={endDate} format="MMMM dd, yyyy" />}
        </ReadonlyInput>
      </Column>
      <Column lg={4} md={4} sm={4} className="district-volume-detail__table-level-factor">
        <ReadonlyInput label="Dispersed retention reduction factor">
          <PrecisionNumberTag value={tableLevelFactor} precision={3} />
        </ReadonlyInput>
      </Column>
      <Column lg={12} md={4} sm={4} className="district-volume-detail__heli-multiplier">
        <ReadonlyInput label="Heli multiplier">
          {heliMultiplier !== undefined ? (
            <PrecisionNumberTag value={heliMultiplier} precision={3} />
          ) : (
            'TBD'
          )}
        </ReadonlyInput>
      </Column>
    </>
  );
};

export default DistrictVolumeDetailHeader;

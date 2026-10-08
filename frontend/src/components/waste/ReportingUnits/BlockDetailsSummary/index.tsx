import { Column, Grid, Tile } from '@carbon/react';
import { type FC } from 'react';

import DateTag from '@/components/core/Tags/DateTag';
import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';

import type { ReportingUnitDto } from '@/api/types';

import './index.scss';

type BlockDetailsSummaryProps = {
  /** Reporting unit data whose read-only fields are shown in the summary card. */
  readonly data: ReportingUnitDto;
};

/**
 * Read-only "Reporting unit summary" card for the block details page.
 *
 * Renders the six summary fields from Figma 161:29613 (client name, client ID,
 * district, grades, sampling option, created on) as {@link ReadonlyInput}
 * definition lists inside a bordered card. Values are display-only: no inputs,
 * edit controls or links are rendered.
 *
 * @param props - Component props.
 * @param props.data - The reporting unit to summarise.
 * @returns The summary card, ready to be placed inside a layout `Column`.
 */
const BlockDetailsSummary: FC<BlockDetailsSummaryProps> = ({ data }) => (
  <Tile className="rublock-summary" data-testid="block-details-summary">
    <h2 className="rublock-summary__title">Reporting unit summary</h2>
    <Grid className="rublock-summary__grid" data-testid="block-details-summary-fields">
      <Column max={3} xlg={3} lg={3} md={4} sm={4}>
        <ReadonlyInput label="Client name">
          <span>{data.client.description}</span>
        </ReadonlyInput>
      </Column>
      <Column max={2} xlg={2} lg={2} md={4} sm={4}>
        <ReadonlyInput label="Client ID">
          <span>{data.client.code}</span>
        </ReadonlyInput>
      </Column>
      <Column max={3} xlg={3} lg={3} md={4} sm={4}>
        <ReadonlyInput label="District">
          <span>
            {data.district.code} - {data.district.description}
          </span>
        </ReadonlyInput>
      </Column>
      <Column max={2} xlg={2} lg={2} md={4} sm={4}>
        <ReadonlyInput label="Grades">
          <EmptyValueTag value={data.grade.description || ''} />
        </ReadonlyInput>
      </Column>
      <Column max={3} xlg={3} lg={3} md={4} sm={4}>
        <ReadonlyInput label="Sampling Option">
          <span>
            {data.sampling.code} - {data.sampling.description}
          </span>
        </ReadonlyInput>
      </Column>
      <Column max={3} xlg={3} lg={3} md={4} sm={4}>
        <ReadonlyInput label="Created on">
          {data.createdAt ? <DateTag date={data.createdAt} format="MMMM dd, yyyy" /> : null}
        </ReadonlyInput>
      </Column>
    </Grid>
  </Tile>
);

export default BlockDetailsSummary;

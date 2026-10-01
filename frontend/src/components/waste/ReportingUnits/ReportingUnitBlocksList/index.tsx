import { Column } from '@carbon/react';
import { type FC } from 'react';

import TableResource from '@/components/Form/TableResource';

import type { PageableResponse, TableHeaderType } from '@/components/Form/TableResource/types';

import './index.scss';

/** Row shape of the reporting-unit blocks table (populated once #1250 lands). */
type ReportingUnitBlocksRow = { id: number };

/**
 * Empty column definitions. The blocks table is rendered through
 * {@link TableResource} so its built-in empty state is reused; row columns
 * and status tags arrive with issue #1250.
 */
const EMPTY_BLOCKS_HEADERS: TableHeaderType<ReportingUnitBlocksRow>[] = [];

/** Empty page payload that drives {@link TableResource}'s "No results" state. */
const EMPTY_BLOCKS_CONTENT: PageableResponse<ReportingUnitBlocksRow> = {
  content: [],
  page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
};

/**
 * Blocks section for the Reporting Unit Details page.
 *
 * Renders a "Blocks" section heading and an empty {@link TableResource} so the
 * built-in "No results" empty state shows until the backend blocks endpoint
 * exists (issue #1250). No data fetching is performed.
 *
 * @returns The blocks section column, ready for the page layout `Grid`.
 */
const ReportingUnitBlocksList: FC = () => (
  <Column lg={16} md={8} sm={4} className="rublocks-column__body">
    <h2 className="rublocks-column__title">Blocks</h2>
    <TableResource
      id="reporting-unit-blocks-list"
      headers={EMPTY_BLOCKS_HEADERS}
      content={EMPTY_BLOCKS_CONTENT}
      loading={false}
      error={false}
      displayToolbar={false}
    />
  </Column>
);

export default ReportingUnitBlocksList;

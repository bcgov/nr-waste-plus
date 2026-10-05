import { Column } from '@carbon/react';
import { useState, type FC } from 'react';

import TableResource from '@/components/Form/TableResource';
import type { PaginationOnChangeType } from '@/components/Form/TableResource/types';
import type { PageableResponse } from '@/types/PageableResponse.types';

import {
  BLOCKS_TABLE_HEADERS,
  EMPTY_BLOCKS_CONTENT,
  type ReportingUnitBlocksRow,
} from './constants';
import './index.scss';

export type { ReportingUnitBlocksRow } from './constants';

/**
 * Component props for the Reporting Unit blocks table.
 *
 * `content` comes from the block-details endpoint (issue #1250). While the query
 * is not wired, leave it undefined and the table renders its empty state.
 */
export interface ReportingUnitBlocksListProps {
  /**
   * Page of blocks to render. When the TanStack Query is wired, pass the query's
   * `data` straight through.
   */
  readonly content?: PageableResponse<ReportingUnitBlocksRow>;
  /**
   * Whether the blocks query is in flight. When the TanStack Query is wired, pass
   * the query's pending state (e.g. `query.isPending`) straight through.
   */
  readonly isLoading?: boolean;
  /**
   * Whether the blocks query failed. When the TanStack Query is wired, pass the
   * query's error state (e.g. `query.isError`) straight through.
   */
  readonly isError?: boolean;
}

/**
 * Renders the District Average blocks table of a Reporting Unit (read-only).
 *
 * Data arrives through the `content` prop so the page stays in charge of the
 * TanStack Query: while issue #1250 is pending the table simply renders its empty
 * state. Column definitions, status colors and the empty page live in
 * `./constants`; pagination and sorting are design-driven out of scope.
 *
 * @param props - {@link ReportingUnitBlocksListProps}
 * @returns The blocks table.
 */
const ReportingUnitBlocksList: FC<ReportingUnitBlocksListProps> = ({
  content,
  isLoading = false,
  isError = false,
}) => {
  const [{ page, pageSize }, setPage] = useState({ page: 0, pageSize: 10 });

  /**
   * Tracks the requested page locally until issue #1250 turns this into
   * server-side paging.
   *
   * @param params - The requested page (0-based) and size.
   */
  const handlePageChange = ({ page: nextPage, pageSize: nextSize }: PaginationOnChangeType) => {
    setPage({ page: nextPage, pageSize: nextSize });
  };

  return (
    <Column sm={4} md={8} lg={16} className="rublocks-column">
      <TableResource
        id="reporting-unit-blocks-list"
        headers={BLOCKS_TABLE_HEADERS}
        // Page metadata is synthesized until issue #1250 provides server-side paging.
        content={{
          content: (content ?? EMPTY_BLOCKS_CONTENT).content,
          page: {
            size: pageSize,
            number: page,
            totalElements: (content ?? EMPTY_BLOCKS_CONTENT).page.totalElements,
            totalPages: (content ?? EMPTY_BLOCKS_CONTENT).page.totalPages,
          },
        }}
        loading={isLoading}
        error={isError}
        displayToolbar={false}
        onPageChange={handlePageChange}
      />
    </Column>
  );
};

export default ReportingUnitBlocksList;

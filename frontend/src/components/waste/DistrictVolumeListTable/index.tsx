import { Column } from '@carbon/react';

import { useListTableState } from '../useListTableState';

import { useDistrictVolumeListRowActions } from './actions';
import { headers } from './constants';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { DistrictVolumeListItem } from '@/services/districtvolumes.types';
import type { FC } from 'react';

import TableResource from '@/components/Form/TableResource';
import { useDistrictVolumeListQuery } from '@/config/react-query/hooks';

import './index.scss';

/**
 * Paginated table of district average waste volume configurations.
 *
 * Manages its own pagination, sorting, and data-fetching state, delegating
 * rendering to {@link TableResource}. The query is configured with
 * `enabled: false` and `staleTime: Infinity` so every search is explicit
 * and results are never served from cache.
 *
 * @returns The district volume list table view.
 */
const DistrictVolumeListTable: FC = () => {
  const getRowActions = useDistrictVolumeListRowActions();

  const { data, isLoading, isFetching, isError, handlePageChange, handleSort } = useListTableState({
    queryHook: useDistrictVolumeListQuery,
  });

  return (
    <Column lg={16} md={8} sm={4} className="configuration-column__content">
      <TableResource
        id="district-volume-list"
        headers={headers}
        content={data ?? ({} as PageableResponse<DistrictVolumeListItem>)}
        loading={isLoading}
        error={!isFetching && isError}
        onPageChange={handlePageChange}
        onSortChange={handleSort}
        displayRange
        displayToolbar
        getRowActions={getRowActions}
      />
    </Column>
  );
};

export default DistrictVolumeListTable;

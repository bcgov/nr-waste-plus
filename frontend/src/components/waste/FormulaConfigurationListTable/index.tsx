import { Column } from '@carbon/react';
import { useState, type FC } from 'react';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { FormulaSetResponse } from '@/services/formulaConfiguration.types';

import TableResource from '@/components/Form/TableResource';
import ConfigurationDeleteConfirmModal from '@/components/waste/ConfigurationDeleteConfirmModal';
import { useFormulaConfigurationListRowActions } from '@/components/waste/FormulaConfigurationListTable/actions';
import { headers } from '@/components/waste/FormulaConfigurationListTable/constants';
import { useListTableState } from '@/hooks/useTableRow';
import { useFormulaSetList, useDeleteFormulaSet } from '@/hooks/useFormulaConfiguration';
import { sendToastEvent } from '@/hooks/useNotificationEvents/eventHandler';

/** Paginated formula-set table backed by the shared TableResource component. */
const FormulaConfigurationListTable: FC = () => {
  const [rowToDelete, setRowToDelete] = useState<FormulaSetResponse | null>(null);
  const { data, isLoading, isFetching, isError, refetch, handlePageChange, handleSort, pageSize } =
    useListTableState({ queryHook: useFormulaSetList });
  const deleteMutation = useDeleteFormulaSet();
  const getRowActions = useFormulaConfigurationListRowActions(setRowToDelete);

  const content = (data as PageableResponse<FormulaSetResponse> | undefined) ?? {
    content: [],
    page: { number: 0, size: pageSize, totalElements: 0, totalPages: 0 },
  };

  return (
    <Column lg={16} md={8} sm={4} className="configuration-column__content">
      <TableResource
        id="formula-configuration-list"
        headers={headers}
        content={content}
        loading={isLoading}
        error={!isFetching && isError}
        onPageChange={handlePageChange}
        onSortChange={handleSort}
        displayRange
        displayToolbar
        getRowActions={getRowActions}
      />
      <ConfigurationDeleteConfirmModal
        open={rowToDelete !== null}
        configurationType="formula configuration"
        startDate={rowToDelete?.startDate ?? ''}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => {
          if (rowToDelete) {
            deleteMutation.mutate(rowToDelete.id, {
              onSuccess: () => {
                setRowToDelete(null);
                refetch();
                sendToastEvent({
                  title: 'Formula set deleted',
                  description: 'The formula configuration was deleted.',
                  eventType: 'success',
                });
              },
            });
          }
        }}
        onClose={() => setRowToDelete(null)}
      />
    </Column>
  );
};

export default FormulaConfigurationListTable;

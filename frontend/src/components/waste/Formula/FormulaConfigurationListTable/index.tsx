import { useState, type FC } from 'react';

import TableResource from '@/components/Form/TableResource';
import ConfigurationDeleteConfirmModal from '@/components/waste/ConfigurationDeleteConfirmModal';
import { useFormulaConfigurationListRowActions } from '@/components/waste/Formula/FormulaConfigurationListTable/actions.tsx';
import { headers } from '@/components/waste/Formula/FormulaConfigurationListTable/constants.tsx';
import { useFormulaSetList, useDeleteFormulaSet } from '@/hooks/useFormulaConfiguration';
import { sendToastEvent } from '@/hooks/useNotificationEvents/eventHandler.ts';
import { useListTableState } from '@/hooks/useTableRow';

import type { FormulaSetListItem } from '@/types/formulaConfiguration.types.ts';
import type { PageableResponse } from '@/types/tableResource.types.ts';

import './index.scss';

/** Paginated formula-set table backed by the shared TableResource component. */
const FormulaConfigurationListTable: FC = () => {
  const [rowToDelete, setRowToDelete] = useState<FormulaSetListItem | null>(null);
  const { data, isLoading, isFetching, isError, refetch, handlePageChange, handleSort, pageSize } =
    useListTableState({ queryHook: useFormulaSetList });
  const deleteMutation = useDeleteFormulaSet();
  const getRowActions = useFormulaConfigurationListRowActions(setRowToDelete);

  const content = (data as PageableResponse<FormulaSetListItem> | undefined) ?? {
    content: [],
    page: { number: 0, size: pageSize, totalElements: 0, totalPages: 0 },
  };

  return (
    <div className="formula-set-list-column__content">
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
    </div>
  );
};

export default FormulaConfigurationListTable;

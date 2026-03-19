import { IconButton, OverflowMenu, OverflowMenuItem, TableCell } from '@carbon/react';

import { type TableResourceActionsProps, resolveTableRowActionValue } from '../types';

import './index.scss';

const TableResourceActions = <T,>({
  row,
  actions,
  maxInlineRowActions,
}: TableResourceActionsProps<T>) => {
  const inlineActions = actions.slice(0, maxInlineRowActions);
  const overflowActions = actions.slice(maxInlineRowActions);

  return (
    <TableCell key={`cell-${row.id}-actions`}>
      <div className="table-row-actions-wrapper">
        {inlineActions.map((action) => {
          const label = resolveTableRowActionValue(action.label, row);
          const icon = resolveTableRowActionValue(action.icon, row);
          const isLoading = action.isLoading
            ? resolveTableRowActionValue(action.isLoading, row)
            : false;
          const disabled =
            (action.isDisabled ? resolveTableRowActionValue(action.isDisabled, row) : false) ||
            isLoading;

          return (
            <IconButton
              key={`row-action-${row.id}-${action.id}`}
              kind="ghost"
              label={label}
              size="sm"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                void action.onClick(row);
              }}
            >
              {icon}
            </IconButton>
          );
        })}
        {overflowActions.length > 0 && (
          <OverflowMenu
            aria-label="Row actions"
            size="sm"
            align="top-start"
            flipped
            onClick={(event) => event.stopPropagation()}
          >
            {overflowActions.map((action) => {
              const label = resolveTableRowActionValue(action.label, row);
              const isLoading = action.isLoading
                ? resolveTableRowActionValue(action.isLoading, row)
                : false;
              const disabled =
                (action.isDisabled ? resolveTableRowActionValue(action.isDisabled, row) : false) ||
                isLoading;

              return (
                <OverflowMenuItem
                  key={`row-action-overflow-${row.id}-${action.id}`}
                  itemText={label}
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    void action.onClick(row);
                  }}
                />
              );
            })}
          </OverflowMenu>
        )}
      </div>
    </TableCell>
  );
};

export default TableResourceActions;

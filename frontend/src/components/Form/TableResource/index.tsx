import {
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableExpandHeader,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  Tooltip,
} from '@carbon/react';
import { Children, useEffect, useRef, useState, type ReactNode } from 'react';

import ColumnCustomizationMenu from './ColumnCustomizationMenu';
import TableResourceActions from './TableResourceActions';
import TableResourceExpandRow from './TableResourceExpandRow';
import TableResourceRow from './TableResourceRow';
import {
  type TableHeaderType,
  type PageableResponse,
  type TableRowAction,
  renderCell,
  getHeaderId,
} from './types';
import { useTableToolbar } from './useTableToolbar';

import type { NestedKeyOf, SortDirectionType } from '@/services/types';

import EmptySection from '@/components/core/EmptySection';

import './index.scss';

/**
 * Pagination parameters for page change events.
 * @typedef {Object} PaginationParams
 * @property {number} page - The current page number (zero-based).
 * @property {number} pageSize - The number of items per page.
 */
type PaginationParams = {
  page: number;
  pageSize: number;
};

type SortingKeys<T> = Record<NestedKeyOf<T>, SortDirectionType>;

/**
 * Props for the TableResource component.
 *
 * @template T
 * @property {id} id - The table ID. Used as unique identifier and for customization persistence.
 * @property {TableHeaderType<T>[]} headers - Array of column definitions, including custom renderers and selection flags.
 * @property {PageableResponse<T>} content - Paginated data to display in the table.
 * @property {boolean} loading - Whether the table is in a loading state.
 * @property {boolean} error - Whether an error occurred while fetching data.
 * @property {boolean} [displayRange] - If true, shows the item range in the pagination component.
 * @property {boolean} [displayToolbar] - If true, shows the toolbar, with the toolbar buttons, such as column customization.
 * @property {ReactNode[]} [toolbarEntries] - Optional array of extra React nodes (toolbar buttons/components) to render in the toolbar content area.
 * @property {(params: PaginationParams) => void} [onPageChange] - Callback for handling page changes.
 * @property {(sortKeys: SortingKeys<T>) => void} [onSortChange] - Callback for handling column sort changes.
 * @property {(rowId: string | number) => Promise<ReactNode>} [onRowExpanded] - Callback for handling row expansion data loading. If declared it will show row expansion, otherwise it will display as normal table row.
 * @property {(row: IdentifiableContent<T>) => TableRowAction<T>[]} [getRowActions] - When provided, appends an "Actions" column to the table. Receives each row and returns the actions to display for it. Actions are split into inline icon buttons and an overflow menu based on `maxInlineRowActions`.
 * @property {number} [maxInlineRowActions=2] - Maximum number of actions shown as inline icon buttons per row. Any actions beyond this limit are placed into a Carbon OverflowMenu. Defaults to 2.
 */
type TableResourceProps<T> = {
  id: string;
  headers: TableHeaderType<T, NestedKeyOf<T>>[];
  content: PageableResponse<T>;
  loading: boolean;
  error: boolean;
  displayRange?: boolean;
  displayToolbar?: boolean;
  toolbarEntries?: ReactNode[];
  onPageChange?: (params: PaginationParams) => void;
  onSortChange?: (sortKeys: SortingKeys<T>) => void;
  onRowExpanded?: (rowId: string | number) => Promise<ReactNode>;
  getRowActions?: (row: PageableResponse<T>['content'][number]) => TableRowAction<T>[];
  maxInlineRowActions?: number;
};

/**
 * TableResource is a generic, reusable table for displaying paginated data with optional loading, error, and empty states.
 * It supports custom column rendering and integrates with Carbon's DataTable and Pagination components.
 *
 * @template T
 * @param {TableResourceProps<T>} props - The props for the component.
 * @returns {JSX.Element} The rendered TableResource component.
 */
const TableResource = <T,>({
  id,
  headers,
  content,
  loading,
  error,
  displayRange,
  displayToolbar,
  toolbarEntries,
  onPageChange,
  onSortChange,
  onRowExpanded,
  getRowActions,
  maxInlineRowActions = 2,
}: TableResourceProps<T>) => {
  const { tableHeaders, onToggleHeader } = useTableToolbar(id, headers);
  const [expandedRow, setExpandedRow] = useState<Set<string>>(new Set());
  const expandedRowRef = useRef<Set<string>>(new Set());
  const [sortState, setSortState] = useState<SortingKeys<T>>(
    headers
      .filter((header) => header.sortable)
      .reduce((acc, header) => {
        acc[header.key] = 'NONE';
        return acc;
      }, {} as SortingKeys<T>),
  );
  const [expandedRowComponent, setExpandedRowComponent] = useState<Map<string, ReactNode>>(
    new Map(),
  );
  // Track request tokens per row to invalidate stale responses
  const pendingRowRequestsRef = useRef<Map<string, number>>(new Map());
  const requestCounterRef = useRef(0);

  // Keep ref in sync with state for reading current expanded rows
  useEffect(() => {
    expandedRowRef.current = expandedRow;
  }, [expandedRow]);

  const handleSortClick = (key: NestedKeyOf<T>) => {
    if (headers.find((h) => h.key === key && !h.sortable)) {
      return;
    }
    let sortingKeys: SortingKeys<T> = {} as SortingKeys<T>;

    setSortState((prevState) => {
      const current = prevState[key];
      const next = current === 'NONE' ? 'ASC' : current === 'ASC' ? 'DESC' : 'NONE';
      const currState = { ...prevState, [key]: next };
      sortingKeys = Object.fromEntries(
        Object.entries(currState).filter(([key, value]) => key && value !== 'NONE'),
      ) as SortingKeys<T>;
      return currState;
    });
    if (onSortChange) {
      onSortChange(sortingKeys);
    }
  };

  const handleRowExpansion = (rowId: string | number) => {
    if (onRowExpanded) {
      const rowKey = `row-${rowId}`;

      // Read current state using ref to determine the toggle decision
      const currentExpandedRows = expandedRowRef.current;
      const isCurrentlyExpanded = currentExpandedRows.has(rowKey);

      if (isCurrentlyExpanded) {
        // Toggle OFF: remove from set and map, invalidate pending requests
        const newSet = new Set(currentExpandedRows);
        newSet.delete(rowKey);
        setExpandedRow(newSet);

        setExpandedRowComponent((prev) => {
          const newMap = new Map(prev);
          newMap.delete(rowKey);
          return newMap;
        });

        // Invalidate any pending requests for this row
        pendingRowRequestsRef.current.delete(rowKey);
      } else {
        // Toggle ON: add to set and fetch content
        const newSet = new Set(currentExpandedRows);
        newSet.add(rowKey);
        setExpandedRow(newSet);

        // Create a request token for this expansion
        const requestToken = requestCounterRef.current + 1;
        requestCounterRef.current = requestToken;
        pendingRowRequestsRef.current.set(rowKey, requestToken);

        onRowExpanded(rowId).then((content) => {
          // Only update if the row is still expanded and this is the latest request
          if (
            expandedRowRef.current.has(rowKey) &&
            pendingRowRequestsRef.current.get(rowKey) === requestToken
          ) {
            setExpandedRowComponent((prev) => {
              const newMap = new Map(prev);
              newMap.set(rowKey, content);
              return newMap;
            });
          }
        });
      }
    }
  };

  const getSortTooltip = (direction: SortDirectionType) => {
    switch (direction) {
      case 'ASC':
        return 'Sort by descending order';
      case 'DESC':
        return 'Clear sort order';
      default:
        return 'Sort by ascending order';
    }
  };

  if (loading)
    return (
      <DataTableSkeleton
        data-testid="loading-skeleton"
        className="default-table-skeleton"
        aria-label="loading table data"
        headers={[
          ...tableHeaders
            .filter((header) => header.selected)
            .map((header) => header as { header: string }),
          ...(getRowActions ? [{ header: 'Actions' }] : []),
        ]}
        rowCount={content.page?.size || 10}
        showToolbar={false}
        showHeader={false}
        zebra={true}
      />
    );

  if (!content || !content.content)
    return (
      <EmptySection
        className="initial-empty-section"
        data-testid="empty-section"
        pictogram="Summit"
        title={error ? 'Something went wrong!' : 'Nothing to show yet!'}
        description={
          error
            ? 'Error occured while searching for results.'
            : 'Enter at least one criteria to start the search. The list will display here.'
        }
      />
    );

  if (content?.page?.totalElements === 0) {
    return (
      <EmptySection
        className="table-empty-section"
        pictogram="UserSearch"
        title="No results"
        description="Consider adjusting your search term(s) and try again."
      />
    );
  }

  const itemRangeText = (min: number, max: number, total: number) =>
    `${min}-${max} of ${total} items`;

  const noItemRangeText = () => '';
  const hasActionsColumn = Boolean(getRowActions);
  const visibleHeaderCount = tableHeaders.filter((header) => header.selected).length;
  const inlineActionsLimit = Math.max(0, maxInlineRowActions);

  return (
    <>
      {displayToolbar && (
        <TableToolbar data-testid="table-toolbar">
          <TableToolbarContent className="table-action-toolbar-content">
            {/* Built-in column customization menu */}
            <ColumnCustomizationMenu headers={tableHeaders} onToggleHeader={onToggleHeader} />
            {/* Extra toolbar entries provided by consumer */}
            {toolbarEntries && Children.toArray(toolbarEntries)}
          </TableToolbarContent>
        </TableToolbar>
      )}
      <Table useZebraStyles>
        <TableHead>
          <TableRow>
            {Boolean(onRowExpanded) && <TableExpandHeader />}
            {tableHeaders
              .filter((header) => header.selected)
              .map((header) => (
                <TableHeader
                  key={`header-${getHeaderId(header)}`}
                  isSortable={Boolean(header.sortable) && Boolean(onSortChange)}
                  isSortHeader={(sortState[header.key] ?? 'NONE') !== 'NONE'}
                  sortDirection={
                    (sortState[header.key] ?? 'NONE') === 'NONE' ? undefined : sortState[header.key]
                  }
                  onClick={() => handleSortClick(header.key)}
                >
                  {Boolean(header.sortable) && Boolean(onSortChange) ? (
                    <Tooltip
                      label={getSortTooltip(sortState[header.key] ?? 'NONE')}
                      align="top"
                      autoAlign
                    >
                      <strong className="table-header-tooltip-trigger">{header.header}</strong>
                    </Tooltip>
                  ) : (
                    <strong>{header.header}</strong>
                  )}
                </TableHeader>
              ))}
            {hasActionsColumn && (
              <TableHeader key="header-actions">
                <strong>Actions</strong>
              </TableHeader>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {content.content.map((row) => {
            const cells = tableHeaders
              .filter((header) => header.selected)
              .map((header) => (
                <TableCell key={`cell-${row.id}-${getHeaderId(header)}`}>
                  {renderCell(row, header)}
                </TableCell>
              ));

            if (hasActionsColumn) {
              const rowActions = getRowActions ? getRowActions(row) : [];

              cells.push(
                <TableResourceActions
                  key={`cell-${row.id}-actions`}
                  row={row}
                  actions={rowActions}
                  maxInlineRowActions={inlineActionsLimit}
                />,
              );
            }

            const isExpandable = Boolean(onRowExpanded);

            const rowKey = `row-${row.id}`;
            return isExpandable ? (
              <TableResourceExpandRow
                key={row.id}
                columns={visibleHeaderCount + (hasActionsColumn ? 1 : 0)}
                isExpanded={expandedRow.has(rowKey)}
                onExpand={() => handleRowExpansion(row.id)}
                expandedChild={expandedRowComponent.get(rowKey)}
              >
                {cells}
              </TableResourceExpandRow>
            ) : (
              <TableResourceRow key={row.id}>{cells}</TableResourceRow>
            );
          })}
        </TableBody>
      </Table>
      {onPageChange && (
        <Pagination
          data-testid="pagination"
          page={content.page.number + 1}
          pageSize={content.page.size}
          pageSizes={[10, 20, 30]}
          totalItems={content.page.totalElements}
          onChange={({ page, pageSize }) => {
            setExpandedRow(new Set());
            setExpandedRowComponent(new Map());
            pendingRowRequestsRef.current.clear();
            onPageChange({ page: page - 1, pageSize });
          }}
          itemRangeText={displayRange ? itemRangeText : noItemRangeText}
        />
      )}
    </>
  );
};

export default TableResource;

import {
  Checkbox,
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarMenu,
} from '@carbon/react';
import { Column as ColumnIcon } from '@carbon/react/icons';
import { useEffect, useState } from 'react';

import EmptySection from '@/components/core/EmptySection';
import { usePreference } from '@/context/preference/usePreference';

import { type TableHeaderType, type PageableResponse, renderCell } from './types';

import type { NestedKeyOf, SortDirectionType } from '@/services/types';

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
 * @property {(params: PaginationParams) => void} [onPageChange] - Callback for handling page changes.
 */
type TableResourceProps<T> = {
  id: string;
  headers: TableHeaderType<T, NestedKeyOf<T>>[];
  content: PageableResponse<T>;
  loading: boolean;
  error: boolean;
  displayRange?: boolean;
  displayToolbar?: boolean;
  onPageChange?: (params: PaginationParams) => void;
  onSortChange?: (sortKeys: SortingKeys<T>) => void;
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
  onPageChange,
  onSortChange,
}: TableResourceProps<T>) => {
  const [tableHeaders, setTableHeaders] = useState(headers);
  const { userPreference, updatePreferences, isLoaded } = usePreference();
  const [sortState, setSortState] = useState<SortingKeys<T>>(
    headers
      .filter((header) => header.sortable)
      .reduce((acc, header) => {
        acc[header.key] = 'NONE';
        return acc;
      }, {} as SortingKeys<T>),
  );

  const loadTableFromPreferences = () => {
    if (userPreference.tableHeaders) {
      const savedKeys = (userPreference.tableHeaders as Record<string, NestedKeyOf<T>[]>)[
        id
      ] as NestedKeyOf<T>[];

      if (savedKeys && Array.isArray(savedKeys)) {
        setTableHeaders(
          headers.map((header) => ({
            ...header,
            selected: savedKeys.includes(header.key),
          })),
        );
      } else {
        setTableHeaders(headers); // fallback to default
      }
    }
  };

  useEffect(() => {
    const preferenceHeaders = tableHeaders
      .filter((header) => header.selected)
      .map((header) => header.key);
    updatePreferences({ tableHeaders: { [id]: preferenceHeaders } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableHeaders]);

  useEffect(() => {
    loadTableFromPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  if (loading)
    return (
      <DataTableSkeleton
        data-testid="loading-skeleton"
        className="default-table-skeleton"
        aria-label="loading table data"
        headers={headers
          .filter((header) => header.selected)
          .map((header) => header as { header: string })}
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

  const onToggleHeader = (key: NestedKeyOf<T>) => {
    setTableHeaders((prevHeaders) => {
      return prevHeaders.map((header) => {
        // Find the header to toggle
        if (header.key === key) {
          // Toggle the header's selected state
          return { ...header, selected: !header.selected };
        }
        return header;
      });
    });
  };

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

  return (
    <>
      {displayToolbar && (
        <TableToolbar data-testid="table-toolbar">
          <TableToolbarContent className="table-action-toolbar-content">
            {/* Extra toolbar entries */}
            <TableToolbarMenu
              className="table-action-menu-button column-menu-button"
              menuOptionsClass="table-search-action-menu-option"
              renderIcon={ColumnIcon}
              iconDescription="Edit columns"
              autoAlign
              highContrast
            >
              <div className="table-action-menu-option-item">
                <div className="helper-text">Select the columns you want to see</div>
                {tableHeaders.map((header) => (
                  <Checkbox
                    key={`header-column-checkbox-${String(header.key)}`}
                    id={`header-column-checkbox-${String(header.key)}`}
                    aria-label={`Toggle ${header.header} column`}
                    className="column-checkbox"
                    labelText={header.header}
                    checked={header.selected}
                    onChange={() => onToggleHeader(header.key)}
                  />
                ))}
              </div>
            </TableToolbarMenu>
          </TableToolbarContent>
        </TableToolbar>
      )}
      <Table useZebraStyles>
        <TableHead>
          <TableRow>
            {tableHeaders
              .filter((header) => header.selected)
              .map((header) => (
                <TableHeader
                  key={`header-${String(header.key)}`}
                  isSortable={Boolean(header.sortable) && Boolean(onSortChange)}
                  isSortHeader={sortState[header.key] !== 'NONE'}
                  sortDirection={
                    sortState[header.key] === 'NONE' ? undefined : sortState[header.key]
                  }
                  onClick={() => handleSortClick(header.key)}
                >
                  {header.header}
                </TableHeader>
              ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {content.content.map((row) => (
            <TableRow key={row.id}>
              {tableHeaders
                .filter((header) => header.selected)
                .map((header) => (
                  <TableCell key={`cell-${row.id}-${String(header.key)}`}>
                    {renderCell(row, header)}
                  </TableCell>
                ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {onPageChange && (
        <Pagination
          data-testid="pagination"
          page={content.page.number + 1}
          pageSize={content.page.size}
          pageSizes={[10, 20, 30]}
          totalItems={content.page.totalElements}
          onChange={({ page, pageSize }) => onPageChange({ page: page - 1, pageSize })}
          itemRangeText={displayRange ? itemRangeText : noItemRangeText}
        />
      )}
    </>
  );
};

export default TableResource;

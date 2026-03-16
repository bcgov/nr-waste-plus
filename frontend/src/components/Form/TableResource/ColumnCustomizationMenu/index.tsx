import { Checkbox, TableToolbarMenu } from '@carbon/react';
import { Column as ColumnIcon } from '@carbon/react/icons';

import { type TableHeaderType, getHeaderId } from '../types';

import type { NestedKeyOf } from '@/services/types';

type ColumnCustomizationMenuProps<T> = {
  headers: TableHeaderType<T, NestedKeyOf<T>>[];
  onToggleHeader: (headerId: string) => void;
};

/**
 * Renders a toolbar menu for customizing table column visibility.
 * Users can toggle columns on/off and their preferences are automatically persisted.
 *
 * @template T
 * @param props The props for the component
 * @param props.headers Array of column definitions with selected state
 * @param props.onToggleHeader Callback fired when user toggles a column's visibility
 * @returns The column customization menu
 */
const ColumnCustomizationMenu = <T,>({
  headers,
  onToggleHeader,
}: ColumnCustomizationMenuProps<T>) => {
  return (
    <TableToolbarMenu
      className="table-action-menu-button column-menu-button"
      menuOptionsClass="table-search-action-menu-option"
      iconDescription="Edit columns"
      autoAlign
      highContrast
      renderIcon={() => (
        <div className="toolbar-menu-columns-display">
          <span className="toolbar-menu-columns-display-text">Edit columns</span>
          <ColumnIcon className="toolbar-menu-columns-display-icon" />
        </div>
      )}
    >
      <div className="table-action-menu-option-item">
        <div className="helper-text">Select the columns you want to see</div>
        {headers.map((header) => (
          <Checkbox
            key={`header-column-checkbox-${getHeaderId(header)}`}
            id={`header-column-checkbox-${getHeaderId(header)}`}
            aria-label={`Toggle ${header.header} column`}
            className="column-checkbox"
            labelText={header.header}
            checked={header.selected}
            onChange={() => onToggleHeader(getHeaderId(header))}
          />
        ))}
      </div>
    </TableToolbarMenu>
  );
};

export default ColumnCustomizationMenu;

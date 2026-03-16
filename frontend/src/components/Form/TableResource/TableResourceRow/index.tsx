import { TableRow } from '@carbon/react';
import { type FC, type ReactNode } from 'react';

type TableResourceRowProps = {
  children: ReactNode;
};

/**
 * Thin wrapper around Carbon's table row for shared table composition.
 *
 * @param props The row props.
 * @param props.children The cells to render inside the row.
 * @returns The table row element.
 */
const TableResourceRow: FC<TableResourceRowProps> = ({ children }) => {
  return <TableRow>{children}</TableRow>;
};

export default TableResourceRow;

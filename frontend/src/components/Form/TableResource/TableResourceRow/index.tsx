import { TableRow } from '@carbon/react';
import { type FC, type ReactNode } from 'react';

type TableResourceRowProps = {
  children: ReactNode;
};

const TableResourceRow: FC<TableResourceRowProps> = ({ children }) => {
  return <TableRow>{children}</TableRow>;
};

export default TableResourceRow;

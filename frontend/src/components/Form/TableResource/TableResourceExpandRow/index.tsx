import { SkeletonText, TableExpandedRow, TableExpandRow } from '@carbon/react';
import { type FC, type ReactNode } from 'react';

type TableResourceExpandRowProps = {
  children: ReactNode;
  columns: number;
  isExpanded: boolean;
  expandedChild?: ReactNode | undefined;
  onExpand: () => void;
};

const TableResourceExpandRow: FC<TableResourceExpandRowProps> = ({
  children,
  columns,
  isExpanded,
  onExpand,
  expandedChild,
}) => {
  return (
    <>
      <TableExpandRow
        aria-label="Expand row for more details"
        isExpanded={isExpanded}
        onExpand={onExpand}
      >
        {children}
      </TableExpandRow>
      {isExpanded && (
        <TableExpandedRow colSpan={columns + 1}>
          {expandedChild ? expandedChild : <SkeletonText lineCount={6} width="100%" />}
        </TableExpandedRow>
      )}
    </>
  );
};

export default TableResourceExpandRow;

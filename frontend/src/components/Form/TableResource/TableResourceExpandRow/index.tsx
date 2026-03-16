import { SkeletonText, TableExpandedRow, TableExpandRow } from '@carbon/react';
import { type FC, type ReactNode } from 'react';

type TableResourceExpandRowProps = {
  children: ReactNode;
  columns: number;
  isExpanded: boolean;
  expandedChild?: ReactNode | undefined;
  onExpand: () => void;
};

/**
 * Renders an expandable table row and its associated expanded content panel.
 *
 * @param props The expand-row props.
 * @param props.children The summary row cells.
 * @param props.columns The number of visible data columns.
 * @param props.isExpanded Whether the row is currently expanded.
 * @param props.expandedChild Optional expanded content.
 * @param props.onExpand Callback fired when the row expansion state changes.
 * @returns The expandable row pair.
 */
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
      <TableExpandedRow colSpan={columns + 1}>
        {expandedChild ? expandedChild : <SkeletonText lineCount={6} width="100%" />}
      </TableExpandedRow>
    </>
  );
};

export default TableResourceExpandRow;

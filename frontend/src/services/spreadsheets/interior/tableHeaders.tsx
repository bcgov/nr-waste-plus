import type { InteriorRow } from './config';
import type { ProcessorColumnHeader } from '@/components/Form/FileUploadInput/fileProcessor';
import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { NestedKeyOf } from '@/services/types';

import PrecisionNumberTag from '@/components/core/Tags/PrecisionNumberTag';

const renderPreciseNumber = (value: unknown) => (
  <PrecisionNumberTag value={value as number} precision={3} />
);

export function toInteriorTableHeader(col: ProcessorColumnHeader): TableHeaderType<InteriorRow> {
  return {
    key: col.key as NestedKeyOf<InteriorRow>,
    header: col.header,
    sortable: false,
    selected: true,
    renderAs: renderPreciseNumber,
  };
}

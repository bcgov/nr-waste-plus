import type { ProcessorColumnHeader } from '@/components/Form/FileUploadInput/fileProcessor';
import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { NestedKeyOf } from '@/services/types';

import PrecisionNumberTag from '@/components/core/Tags/PrecisionNumberTag';

import type { CoastRow } from './config';

const renderPreciseNumber = (value: unknown) => (
  <PrecisionNumberTag value={value as number} precision={3} />
);

export function toCoastTableHeader(
  col: ProcessorColumnHeader,
): TableHeaderType<CoastRow> {
  return {
    key: col.key as NestedKeyOf<CoastRow>,
    header: col.header,
    sortable: false,
    selected: true,
    renderAs: renderPreciseNumber,
  };
}

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { CodeDescriptionDto } from '@/services/types';
import type { NestedKeyOf, PageableResponse } from '@/types/PageableResponse.types';

import ColorTag, { type CarbonColors } from '@/components/core/Tags/ColorTag';
import DateTag from '@/components/core/Tags/DateTag';
import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';

/**
 * A single row of the Reporting Unit blocks table (District Average Draft state,
 * Figma `161:29645`).
 *
 * Nullable fields render an empty-value indicator. This shape matches the design
 * table columns; replace it with the real response DTO once issue #1250 delivers
 * the block-details endpoint.
 */
export type ReportingUnitBlocksRow = {
  /** Row key required by {@link TableResource}. */
  id: number;
  /** Forest licence number, e.g. `A00123`. */
  licenseNumber: string | null;
  /** Cutting permit number, e.g. `75`. */
  cuttingPermit: string | null;
  /** Cut block identifier, e.g. `101` — labelled "Block ID" in the design. */
  cutBlockId: string;
  /** Timber mark, e.g. `75/1AD`. */
  timberMark: string | null;
  /** Total waste area in hectares, rendered as `x.xx ha`. */
  totalWasteAreaHa: number | null;
  /** Total waste volume in cubic metres, rendered as `x m3`. */
  totalWasteVolumeM3: number | null;
  /** Name of the submitter or sponsor, e.g. `Jane Lumberjack`. */
  submitter: string | null;
  /** Submission status, shown as a {@link ColorTag} using {@link BLOCK_STATUS_COLOR_MAP}. */
  status: CodeDescriptionDto;
  /** ISO date-time of the last update, split into "Last updated" (date) and "Time" columns. */
  lastUpdated: string | null;
};

/**
 * Maps the block submission status codes rendered in the table to their Carbon tag
 * colors, mirroring the District Average design tokens.
 */
export const BLOCK_STATUS_COLOR_MAP: Record<string, CarbonColors> = {
  SUB: 'blue',
  APP: 'green',
  BIS: 'green',
  OREJ: 'red',
  HLD: 'teal',
  DFT: 'outline',
};

/**
 * Renders the shared empty-value tag for optional text cells.
 *
 * {@link TableResource} renders `null`/`undefined` values as a plain dash before
 * `renderAs` runs, so this only ever receives defined values (cast matches the
 * established pattern from `WasteSearchTable`).
 *
 * @param value - The cell value.
 * @returns An {@link EmptyValueTag} for the value.
 */
const renderEmptyValueTag = (value: unknown) => <EmptyValueTag value={value as string} />;

/**
 * Column definitions for the Reporting Unit blocks table, following the District
 * Average Draft-state design (Figma `161:29645`): Licence No., Cutting permit,
 * Block ID, Timber mark, Total waste area, Total waste volume, Submitter/Sponsor,
 * Status, Last updated, Time. Read-only: no sorting, selection or row actions.
 */
export const BLOCKS_TABLE_HEADERS: TableHeaderType<
  ReportingUnitBlocksRow,
  NestedKeyOf<ReportingUnitBlocksRow>
>[] = [
  {
    key: 'licenseNumber',
    header: 'Licence No.',
    selected: true,
    renderAs: renderEmptyValueTag,
  },
  {
    key: 'cuttingPermit',
    header: 'Cutting permit',
    selected: true,
    renderAs: renderEmptyValueTag,
  },
  { key: 'cutBlockId', header: 'Block ID', selected: true, renderAs: renderEmptyValueTag },
  {
    key: 'timberMark',
    header: 'Timber mark',
    selected: true,
    renderAs: renderEmptyValueTag,
  },
  {
    key: 'totalWasteAreaHa',
    header: 'Total waste area',
    selected: true,
    renderAs: (value) => <EmptyValueTag value={`${(value as number).toFixed(2)} ha`} />,
  },
  {
    key: 'totalWasteVolumeM3',
    header: 'Total waste volume',
    selected: true,
    renderAs: (value) => <EmptyValueTag value={`${value as number} m3`} />,
  },
  {
    key: 'submitter',
    header: 'Submitter/Sponsor',
    selected: true,
    renderAs: renderEmptyValueTag,
  },
  {
    key: 'status',
    header: 'Status',
    selected: true,
    renderAs: (value) => (
      <ColorTag
        value={value as CodeDescriptionDto}
        colorMap={BLOCK_STATUS_COLOR_MAP}
        showTooltip={false}
      />
    ),
  },
  {
    key: 'lastUpdated',
    header: 'Last updated',
    selected: true,
    renderAs: (value) => <DateTag date={value as string} format="DD" />,
  },
  {
    key: 'lastUpdated',
    id: 'lastUpdatedTime',
    header: 'Time',
    selected: true,
    renderAs: (value) => <DateTag date={value as string} format="HH:mm" />,
  },
];

/**
 * Empty page rendered while the blocks endpoint (issue #1250) is not wired yet —
 * and, afterwards, when the Reporting Unit genuinely has no blocks. Triggers the
 * table's "Nothing to show yet!" empty state.
 */
export const EMPTY_BLOCKS_CONTENT: PageableResponse<ReportingUnitBlocksRow> = {
  content: [],
  page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
};

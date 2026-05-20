import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { MyForestClientDto } from '@/services/types';

import DateTag from '@/components/core/Tags/DateTag';
import RedirectLinkTag from '@/components/waste/RedirectLinkTag';

/**
 * Column definitions for the My Client List results table.
 *
 * Each entry describes a data column with its header label, sort behaviour,
 * default visibility (`selected`), and an optional `renderAs` function that
 * controls how cell values are displayed (e.g. redirect links, date formatting).
 *
 * The `client.code` column links to the waste search page filtered to that client number.
 */
export const headers: TableHeaderType<MyForestClientDto>[] = [
  {
    key: 'client.code',
    header: 'Client No.',
    sortable: true,
    selected: true,
    renderAs: (value) => (
      <RedirectLinkTag text={value as string} url={`/search?clientNumbers=${value}`} sameTab />
    ),
  },
  { key: 'client.description', header: 'Client name', sortable: true, selected: true },
  { key: 'submissionsCount', header: 'RUs created by me', sortable: false, selected: true },
  { key: 'blocksCount', header: 'Draft blocks in my RUs', sortable: false, selected: true },
  {
    key: 'lastUpdate',
    header: 'Last Update',
    sortable: true,
    selected: true,
    renderAs: (value) => <DateTag date={value as string} />,
  },
];

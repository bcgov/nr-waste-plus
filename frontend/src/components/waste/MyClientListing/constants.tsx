import DateTag from '@/components/core/Tags/DateTag';
import RedirectLinkTag from '@/components/waste/RedirectLinkTag';
import { env } from '@/env';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { ForestClientDistrictDto } from '@/services/types';

export const headers: TableHeaderType<ForestClientDistrictDto>[] = [
  {
    key: 'client.code',
    header: 'Client No.',
    sortable: true,
    selected: true,
    renderAs: (value) => (
      <RedirectLinkTag
        text={value as string}
        url={`${env.VITE_CLIENT_BASE_URL}/clients/details/${value}`}
      />
    ),
  },
  { key: 'client.description', header: 'Client Name', sortable: true, selected: true },
  { key: 'submissionsCount', header: 'Submission Count', sortable: false, selected: true },
  { key: 'blocksCount', header: 'Draft Block Count', sortable: false, selected: true },
  {
    key: 'lastUpdate',
    header: 'Last Update',
    sortable: true,
    selected: true,
    renderAs: (value) => <DateTag date={value as string} />,
  },
];

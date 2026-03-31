import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { MyForestClientDto } from '@/services/types';

import DateTag from '@/components/core/Tags/DateTag';
import RoleBasedRedirectLinkTag from '@/components/waste/RoleBasedRedirectLinkTag';
import { Role } from '@/context/auth/types';
import { env } from '@/env';

export const headers: TableHeaderType<MyForestClientDto>[] = [
  {
    key: 'client.code',
    header: 'Client No.',
    sortable: true,
    selected: true,
    renderAs: (value) => (
      <RoleBasedRedirectLinkTag
        text={value as string}
        url={`${env.VITE_CLIENT_BASE_URL}/clients/details/${value}`}
        allowedRoles={[Role.IDIR]}
      />
    ),
  },
  { key: 'client.description', header: 'Client name', sortable: true, selected: true },
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

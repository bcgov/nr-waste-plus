import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { CodeDescriptionDto, ReportingUnitSearchResultDto } from '@/services/types';

import ColorTag, { type CarbonColors } from '@/components/core/Tags/ColorTag';
import DateTag from '@/components/core/Tags/DateTag';
import YesNoTag from '@/components/core/Tags/YesNoTag';
import CodeDescriptionTag from '@/components/waste/CodeDescriptionTag';
import TooltipRedirectLinkTag from '@/components/waste/TooltipRedirectLinkTag';
import TooltipRoleBasedRedirectLinkTag from '@/components/waste/TooltipRoleBasedRedirectLinkTag';
import { Role } from '@/context/auth/types';
import { env } from '@/env';

const statusColorMap: Record<string, CarbonColors> = {
  ERR: 'red',
  FREJ: 'red',
  OREJ: 'red',
  REJ: 'red',
  HLD: 'teal',
  HWR: 'teal',
  RBL: 'teal',
  APP: 'green',
  BIP: 'green',
  BIS: 'green',
  BPR: 'green',
  COM: 'green',
  REV: 'green',
  RTB: 'green',
  WRA: 'green',
  SUB: 'blue',
  DFT: 'outline',
  ISUB: 'outline',
  DAC: 'gray',
  EXP: 'cyan',
};

export const headers: TableHeaderType<ReportingUnitSearchResultDto>[] = [
  { key: 'cutBlockId', header: 'Block ID', sortable: true, selected: true },
  { key: 'licenseNumber', header: 'Licence No.', sortable: true, selected: false },
  { key: 'cuttingPermit', header: 'Cutting Permit', sortable: true, selected: false },
  { key: 'timberMark', header: 'Timber Mark', sortable: true, selected: false },

  {
    key: 'ruNumber',
    header: 'RU No.',
    sortable: true,
    selected: true,
    renderAs: (value) => (
      <TooltipRedirectLinkTag
        text={value as string}
        url={`${env.VITE_LEGACY_BASE_URL}/waste101ReportUnitDetailsAction.do?dataBean.p_reporting_unit_id=${value}`}
        tooltip={'Go to RU details'}
      />
    ),
  },

  {
    key: 'client.code',
    header: 'Client No.',
    sortable: true,
    selected: true,
    renderAs: (value) => (
      <TooltipRoleBasedRedirectLinkTag
        tooltip="View client details"
        text={value as string}
        url={`${env.VITE_CLIENT_BASE_URL}/clients/details/${value}`}
        allowedRoles={[Role.IDIR]}
      />
    ),
  },
  { key: 'client.description', header: 'Client name', sortable: true, selected: true },

  {
    key: 'sampling',
    header: 'Sampling option',
    sortable: true,
    selected: true,
    renderAs: (value) => <CodeDescriptionTag value={value as CodeDescriptionDto} />,
  },
  { key: 'sampling.code', header: 'Sampling code', sortable: true },
  { key: 'sampling.description', header: 'Sampling name', sortable: true },

  {
    key: 'multiMark',
    header: 'Multi-mark (Y/N)',
    sortable: true,
    selected: false,
    renderAs: (value) => <YesNoTag value={value as string | boolean | number | null | undefined} />,
  },

  {
    key: 'district',
    header: 'District',
    sortable: true,
    selected: true,
    renderAs: (value) => <CodeDescriptionTag value={value as CodeDescriptionDto} />,
  },
  { key: 'district.code', header: 'District code', sortable: true },
  { key: 'district.description', header: 'District name', sortable: true },

  {
    key: 'status',
    header: 'Status',
    sortable: true,
    selected: true,
    renderAs: (value) => (
      <ColorTag value={value as { code: string; description: string }} colorMap={statusColorMap} />
    ),
  },
  { key: 'status.code', header: 'Status code', sortable: true },
  { key: 'status.description', header: 'Status name', sortable: true },

  {
    key: 'lastUpdated',
    header: 'Last updated',
    sortable: true,
    selected: true,
    renderAs: (value) => <DateTag date={value as string} />,
  },
];

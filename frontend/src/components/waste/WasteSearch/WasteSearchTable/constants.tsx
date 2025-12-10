import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { CodeDescriptionDto, ReportingUnitSearchResultDto } from '@/services/types';

import ColorTag, { type CarbonColors } from '@/components/core/Tags/ColorTag';
import DateTag from '@/components/core/Tags/DateTag';
import YesNoTag from '@/components/core/Tags/YesNoTag';
import CodeDescriptionTag from '@/components/waste/CodeDescriptionTag';
import RedirectLinkTag from '@/components/waste/RedirectLinkTag';
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
  { key: 'blockId', header: 'Block ID', sortable: true, selected: true },
  { key: 'licenseNumber', header: 'License No.', sortable: true, selected: false },
  { key: 'cuttingPermit', header: 'CP - Cutting permit', sortable: true, selected: false },
  { key: 'timberMark', header: 'TM - Timber mark', sortable: true, selected: false },

  {
    key: 'ruNumber',
    header: 'RU No.',
    sortable: false,
    selected: true,
    renderAs: (value) => (
      <RedirectLinkTag
        text={value as string}
        url={`${env.VITE_LEGACY_BASE_URL}/waste101ReportUnitDetailsAction.do?dataBean.p_reporting_unit_id=${value}`}
      />
    ),
  },

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

  {
    key: 'sampling',
    header: 'Sampling Option',
    sortable: true,
    selected: true,
    renderAs: (value) => <CodeDescriptionTag value={value as CodeDescriptionDto} />,
  },
  { key: 'sampling.code', header: 'Sampling Code', sortable: true },
  { key: 'sampling.description', header: 'Sampling Name', sortable: true },

  {
    key: 'multiMark',
    header: 'Multi-Mark (Y/N)',
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
  { key: 'district.code', header: 'District Code', sortable: true },
  { key: 'district.description', header: 'District Name', sortable: true },

  {
    key: 'status',
    header: 'Status',
    sortable: true,
    selected: true,
    renderAs: (value) => (
      <ColorTag value={value as { code: string; description: string }} colorMap={statusColorMap} />
    ),
  },
  { key: 'status.code', header: 'Status Code', sortable: true },
  { key: 'status.description', header: 'Status Name', sortable: true },

  {
    key: 'lastUpdated',
    header: 'Last Updated',
    sortable: true,
    selected: true,
    renderAs: (value) => <DateTag date={value as string} />,
  },
];

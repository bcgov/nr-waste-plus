import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { CodeDescriptionDto, ReportingUnitSearchResultDto } from '@/services/types';

import ColorTag, { type CarbonColors } from '@/components/core/Tags/ColorTag';
import DateTag from '@/components/core/Tags/DateTag';
import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';
import YesNoTag from '@/components/core/Tags/YesNoTag';
import CodeDescriptionTag from '@/components/waste/CodeDescriptionTag';
import TooltipRedirectLinkTag from '@/components/waste/TooltipRedirectLinkTag';
import TooltipRoleBasedRedirectLinkTag from '@/components/waste/TooltipRoleBasedRedirectLinkTag';
import { Role } from '@/context/auth/types';
import { env, featureFlags } from '@/env';

/**
 * Maps reporting-unit status codes to their corresponding Carbon Design System tag colours.
 *
 * Used by the `status` column's `renderAs` function to colour-code each status at a glance.
 * Any code not present in this map will render without a colour override.
 */
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

/**
 * Renders an {@link EmptyValueTag} for a raw cell value.
 *
 * Used as the shared `renderAs` function for simple string columns that need
 * a consistent fallback when the value is empty or null.
 *
 * @param value - Raw cell value from the data row.
 * @returns An `EmptyValueTag` element.
 */
const renderEmptyValueTag = (value: unknown) => <EmptyValueTag value={value as string} />;

/**
 * Column definitions for the Waste Search results table.
 *
 * Each entry describes a data column with its header label, sort behaviour,
 * default visibility (`selected`), and an optional `renderAs` function that
 * controls how cell values are displayed (e.g. tag components, date formatting,
 * role-gated links).
 *
 * The `ruNumber` column conditionally links to the new React-router RU details
 * page when the `reporting-unit-details-enabled` feature flag is active;
 * otherwise it links to the legacy system URL.
 */
export const headers: TableHeaderType<ReportingUnitSearchResultDto>[] = [
  {
    key: 'cutBlockId',
    header: 'Block ID',
    sortable: true,
    selected: true,
    renderAs: renderEmptyValueTag,
  },
  {
    key: 'licenseNumber',
    header: 'Licence No.',
    sortable: true,
    selected: false,
    renderAs: renderEmptyValueTag,
  },
  {
    key: 'cuttingPermit',
    header: 'Cutting Permit',
    sortable: true,
    selected: false,
    renderAs: renderEmptyValueTag,
  },
  {
    key: 'timberMark',
    header: 'Timber Mark',
    sortable: true,
    selected: false,
    renderAs: renderEmptyValueTag,
  },
  {
    key: 'ruNumber',
    header: 'RU No.',
    sortable: true,
    selected: true,
    renderAs: (value) =>
      featureFlags['reporting-unit-details-enabled'] ? (
        <TooltipRedirectLinkTag
          text={value as string}
          url={`/reporting-units/${value}`}
          tooltip={'Go to RU details'}
          sameTab
          clearSearch
        />
      ) : (
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
  { key: 'client.description', header: 'Client name', sortable: false, selected: true },
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
    sortable: false,
    selected: false,
    renderAs: (value) => <YesNoTag value={value as string | boolean | number | null | undefined} />,
  },
  {
    key: 'secondaryEntry',
    header: 'Secondary entry (Y/N)',
    sortable: false,
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
      <ColorTag
        value={value as { code: string; description: string }}
        colorMap={statusColorMap}
        showTooltip={false}
      />
    ),
  },
  { key: 'status.code', header: 'Status code', sortable: true },
  { key: 'status.description', header: 'Status name', sortable: true },
  {
    id: 'lastUpdated',
    key: 'lastUpdated',
    header: 'Last updated on',
    sortable: true,
    selected: true,
    renderAs: (value) => <DateTag date={value as string} format="DD" />,
  },
  {
    id: 'lastUpdatedTimestamp',
    key: 'lastUpdated',
    header: 'Timestamp',
    sortable: true,
    selected: false,
    renderAs: (value) => <DateTag date={value as string} format="t" />,
  },
];

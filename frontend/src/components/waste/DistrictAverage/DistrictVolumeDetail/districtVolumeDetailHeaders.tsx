import type { ReactNode } from 'react';

import type { TableHeaderType } from '@/components/Form/TableResource/types.ts';

import PrecisionNumberTag from '@/components/core/Tags/PrecisionNumberTag';

type DistrictColumnDefinition = {
  key: string;
  header: string;
};

export function buildDistrictVolumeDetailHeaders<T extends Record<string, unknown>>(
  renderDistrictCode: (value: string | number) => ReactNode,
  numericColumns: readonly DistrictColumnDefinition[],
): TableHeaderType<T>[] {
  const districtHeader = {
    key: 'code' as keyof T,
    header: 'District',
    selected: true,
    renderAs: renderDistrictCode as TableHeaderType<T>['renderAs'],
  };

  const numericHeaders = numericColumns.map(({ key, header }) => ({
    key: key as keyof T,
    header,
    selected: true,
    renderAs: (value: unknown) => <PrecisionNumberTag value={Number(value)} precision={3} />,
  }));

  return [districtHeader, ...numericHeaders] as TableHeaderType<T>[];
}

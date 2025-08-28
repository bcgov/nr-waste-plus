import type { SortDirectionType } from '@/components/Form/TableResource/types';

export type PageableRequest<
  T,
  K extends Extract<keyof T, string | number> = Extract<keyof T, string | number>,
> = {
  page: number;
  size: number;
  sort?: Array<`${K},${SortDirectionType}`>;
};

import type { WasteSearchFilters } from '@/routes/searchParams';
import type {
  CodeDescriptionDto,
  ReportingUnitSearchParametersViewDto,
} from '@/types/search.types';

const toCodeDescriptionDtos = (values: string[]): CodeDescriptionDto[] =>
  values.map((code) => ({ code, description: code }));

/**
 * Maps validated `/search` URL state to the view DTO the filter components consume
 * (URL code strings → `CodeDescriptionDto` items for the client multiselect).
 *
 * @param search The validated route search params.
 * @returns The equivalent view-shaped filter object.
 */
export const searchToViewDto = (
  search: WasteSearchFilters,
): ReportingUnitSearchParametersViewDto => {
  const { clientNumbers, ...rest } = search;
  return {
    ...rest,
    ...(clientNumbers ? { clientNumbers: toCodeDescriptionDtos(clientNumbers) } : {}),
  };
};

/**
 * Maps the view DTO to the URL search-param shape: client items collapse back to
 * code strings, and empty values (empty arrays, empty strings, `undefined`) are
 * dropped so the URL only ever carries real selections. `legacy: false` is a real
 * value and is kept.
 *
 * @param view The view-shaped filter object.
 * @returns The URL search-param object to hand to the router.
 */
export const viewDtoToSearch = (view: ReportingUnitSearchParametersViewDto): WasteSearchFilters => {
  const { clientNumbers, ...rest } = view;
  const candidate: WasteSearchFilters = {
    ...rest,
    ...(clientNumbers?.length
      ? {
          clientNumbers: clientNumbers.map((item) => item.code ?? '').filter((code) => code !== ''),
        }
      : {}),
  };

  return Object.fromEntries(
    Object.entries(candidate).filter(
      ([, value]) =>
        value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0),
    ),
  ) as WasteSearchFilters;
};

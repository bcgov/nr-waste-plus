import { useMemo, type ReactNode } from 'react';

import type { CodeDescriptionDto } from '@/services/search.types';

import CodeDescriptionTag from '@/components/waste/CodeDescriptionTag';

/**
 * Builds a `renderAs` function for the district *code* column used by both
 * the Interior and Coast detail views.
 *
 * Creates an O(1) `Map` lookup from the cached {@link districtOptions} so each
 * cell renders `<CodeDescriptionTag>` with both the district code and its
 * human-readable description. Falls back to showing just the code when no
 * description is found.
 *
 * @param districtOptions - Cached district code/description pairs from
 *   `useDistrictOptionsQuery`.
 * @returns A render function that accepts a district code string and returns a
 *   `<CodeDescriptionTag>` element.
 */
export function useDistrictCodeColumn(
  districtOptions: CodeDescriptionDto[],
): (value: string | number) => ReactNode {
  const districtMap = useMemo(
    () => new Map(districtOptions.map((d) => [d.code, d.description])),
    [districtOptions],
  );

  return (value: string | number) => {
    const code = String(value);
    const description = districtMap.get(code) ?? code;
    return <CodeDescriptionTag value={{ code, description }} />;
  };
}

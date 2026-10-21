import { Column } from '@carbon/react';
import { type FC, useMemo } from 'react';

import TooltipTag from '@/components/core/Tags/TooltipTag';
import TableResource from '@/components/Form/TableResource';
import { useDistrictOptionsQuery } from '@/config/react-query/hooks.ts';
import { SPECIES_DESCRIPTIONS, SPECIES_LABELS } from '@/types/speciesComposition.types.ts';

import type { NestedKeyOf } from '@/types/pagination.types.ts';
import type { CodeDescriptionDto } from '@/types/search.types.ts';
import type { SpeciesCompositionRow, SpeciesKey } from '@/types/speciesComposition.types.ts';
import type {
  TableHeaderType,
  PageableResponse,
  IdentifiableContent,
} from '@/types/tableResource.types.ts';

/**
 * Props for the {@link SpeciesCompositionDetailMatrix} component.
 */
interface SpeciesCompositionDetailMatrixProps {
  /** The rows of species composition data. */
  readonly rows: SpeciesCompositionRow[];
}

/**
 * Renders the district × species composition matrix using TableResource.
 *
 * Each row represents a district with 19 species numeric columns plus a total.
 * The district column shows the district code with a tooltip revealing the full description.
 * Each species column header shows the abbreviated code with a tooltip revealing the
 * full species name on hover.
 *
 * @param props - Component props.
 * @returns The matrix table component.
 */
const SpeciesCompositionDetailMatrix: FC<SpeciesCompositionDetailMatrixProps> = ({ rows }) => {
  const districtOptionsQuery = useDistrictOptionsQuery();

  const districtMap = useMemo(
    () =>
      new Map(
        (districtOptionsQuery?.data ?? []).map((district) => [district.code, district.description]),
      ),
    [districtOptionsQuery?.data],
  );

  const content: PageableResponse<SpeciesCompositionRow> = useMemo(() => {
    // Rows arrive validated from the query boundary; drop rows without a
    // resolvable district rather than rendering an unusable matrix row.
    const validRows = rows.filter((row) => row.district != null);

    return {
      content: validRows.map((row, index) => ({
        ...row,
        id: row.district?.code ?? `unknown-${index}`,
      })) as IdentifiableContent<SpeciesCompositionRow>[],
      page: {
        size: validRows.length,
        number: 0,
        totalElements: validRows.length,
        totalPages: 1,
      },
    };
  }, [rows]);

  const headers: TableHeaderType<SpeciesCompositionRow>[] = useMemo(() => {
    const speciesColumns: TableHeaderType<SpeciesCompositionRow>[] = (
      Object.keys(SPECIES_LABELS) as SpeciesKey[]
    ).map((key) => ({
      key: `species.${key}` as NestedKeyOf<SpeciesCompositionRow>,
      header: SPECIES_LABELS[key],
      selected: true,
      headerTooltip: SPECIES_DESCRIPTIONS[key],
    }));

    return [
      {
        key: 'district',
        header: 'District',
        selected: true,
        renderAs: (value) => {
          const district = value as CodeDescriptionDto | null | undefined;
          if (!district?.code) {
            return <span>-</span>;
          }

          const code = district.code;
          const description = districtMap.get(code) ?? district.description ?? code;
          return (
            <TooltipTag tooltip={description} align="right">
              <span>{code}</span>
            </TooltipTag>
          );
        },
      },
      ...speciesColumns,
    ];
  }, [districtMap]);

  return (
    <Column lg={16} md={8} sm={4} className="species-composition-detail__zones">
      <TableResource
        id="species-composition-matrix"
        headers={headers}
        content={content}
        loading={false}
        error={false}
      />
    </Column>
  );
};

export default SpeciesCompositionDetailMatrix;

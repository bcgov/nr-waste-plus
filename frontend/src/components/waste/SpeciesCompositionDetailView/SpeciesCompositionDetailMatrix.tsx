import { Column } from '@carbon/react';
import { type FC, useMemo } from 'react';

import type {
  TableHeaderType,
  PageableResponse,
  IdentifiableContent,
} from '@/components/Form/TableResource/types';
import type { NestedKeyOf } from '@/services/pagination.types';
import type { CodeDescriptionDto } from '@/services/search.types';
import type { SpeciesCompositionRow, SpeciesKey } from '@/services/speciesComposition.types';

import TooltipTag from '@/components/core/Tags/TooltipTag';
import TableResource from '@/components/Form/TableResource';
import { useDistrictOptionsQuery } from '@/config/react-query/hooks';
import { SPECIES_DESCRIPTIONS, SPECIES_LABELS } from '@/services/speciesComposition.types';

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
  const { data: districtOptions = [] } = useDistrictOptionsQuery();

  const districtMap = useMemo(
    () => new Map(districtOptions.map((d) => [d.code, d.description])),
    [districtOptions],
  );

  const content: PageableResponse<SpeciesCompositionRow> = useMemo(
    () => ({
      content: rows.map((row) => ({
        ...row,
        id: row.district.code,
      })) as IdentifiableContent<SpeciesCompositionRow>[],
      page: {
        size: rows.length,
        number: 0,
        totalElements: rows.length,
        totalPages: 1,
      },
    }),
    [rows],
  );

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
          const district = value as CodeDescriptionDto;
          const description = districtMap.get(district.code) ?? district.description;
          return (
            <TooltipTag tooltip={description} align="right">
              <span>{district.code}</span>
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

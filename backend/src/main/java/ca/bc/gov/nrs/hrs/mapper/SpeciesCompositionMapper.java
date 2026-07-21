package ca.bc.gov.nrs.hrs.mapper;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.speciescomposition.SpeciesCompositionDataDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Utility mapper for converting between the shared configuration entity's TableData 
 * and Species Composition DTOs.
 *
 * <p>As per the architectural design, Species Composition uses a single flat DTO
 * ({@link SpeciesCompositionDataDto}) containing a flat list of {@link SpeciesCompositionRow}.
 * The row record acts as both the API DTO and the JSONB persistence model.
 *
 * <p>Note: This mapper explicitly preserves the full {@link CodeDescriptionDto} 
 * (including the description field) as required by ticket #1052.
 */
public final class SpeciesCompositionMapper {

  private SpeciesCompositionMapper() {}

  /**
   * Converts the DistrictVolumeEntity directly to the flat SpeciesCompositionDataDto,
   * satisfying the service layer requirements.
   *
   * @param entity source entity
   * @return flat SpeciesCompositionDataDto
   */
  public static SpeciesCompositionDataDto toDto(DistrictVolumeEntity entity) {
    if (entity == null) {
      return null;
    }
    return toSpeciesDataDto(entity.getTableData());
  }

  /**
   * Extracts the flat list of SpeciesCompositionRow from the shared JSONB TableData model.
   *
   * @param data source JSONB payload
   * @return flat SpeciesCompositionDataDto
   */
  public static SpeciesCompositionDataDto toSpeciesDataDto(TableData data) {
    if (data == null || data.speciesRows() == null) {
      return new SpeciesCompositionDataDto(Collections.emptyList());
    }

    List<SpeciesCompositionRow> scaledRows = data.speciesRows().stream()
        .map(SpeciesCompositionMapper::scaleRow)
        .toList();

    return new SpeciesCompositionDataDto(scaledRows);
  }

  /**
   * Maps the flat SpeciesCompositionDataDto into the shared JSONB TableData model.
   *
   * @param dto source flat data DTO
   * @return shared JSONB payload
   */
  public static TableData toEntityTableData(SpeciesCompositionDataDto dto) {
    if (dto == null || dto.rows() == null) {
      return new TableData(null, null, null, Map.of());
    }

    List<SpeciesCompositionRow> scaledRows = dto.rows().stream()
        .map(SpeciesCompositionMapper::scaleRow)
        .toList();

    return new TableData(
        null,       // zones
        null,       // sections
        scaledRows, // speciesRows
        Map.of()    // formulas
    );
  }

  /**
   * Recreates the row to ensure all BigDecimals are strictly scaled to 3 decimal places.
   * Explicitly passes through the full district object without stripping the description.
   */
  private static SpeciesCompositionRow scaleRow(SpeciesCompositionRow row) {
    if (row == null) {
      return null;
    }

    return new SpeciesCompositionRow(
        row.district(), 
        scale(row.balsam()),
        scale(row.cedar()),
        scale(row.cottonwood()),
        scale(row.cypress()),
        scale(row.fir()),
        scale(row.hemlock()),
        scale(row.larch()),
        scale(row.maple()),
        scale(row.pine()),
        scale(row.poplar()),
        scale(row.redcedar()),
        scale(row.redwood()),
        scale(row.spruce()),
        scale(row.whitebirch()),
        scale(row.whitepine()),
        scale(row.yew()),
        scale(row.other()),
        scale(row.unknown()),
        scale(row.total())
    );
  }

  private static BigDecimal scale(BigDecimal value) {
    return value == null ? null : value.setScale(3, RoundingMode.HALF_UP);
  }
}
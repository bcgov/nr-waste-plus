package ca.bc.gov.nrs.hrs.mapper;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDistrictRowDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastSectionDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDistrictRowDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorZoneDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.TableDataDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictRow;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Section;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Zone;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

/**
 * Utility mapper for converting between district volume entities and DTOs.
 *
 * <p>This class provides bidirectional mapping between:
 *
 * <ul>
 *   <li>{@link DistrictVolumeEntity} and summary/detail DTOs
 *   <li>Create DTOs and persistence entities
 *   <li>Polymorphic table data DTOs and their corresponding JSONB-backed domain
 *       representations
 * </ul>
 *
 * <p>Numeric values are normalized to a scale of three decimal places using
 * {@link RoundingMode#HALF_UP}.
 */
public final class DistrictVolumeMapper {

  /**
   * Prevents instantiation of this utility class.
   */
  private DistrictVolumeMapper() {}

  /**
   * Converts a district volume entity into a list item DTO.
   *
   * @param entity source entity
   * @return mapped list item DTO
   */
  public static DistrictVolumeListItemDto toListItemDto(DistrictVolumeEntity entity) {
    return new DistrictVolumeListItemDto(
        entity.getId(),
        entity.getArea().name(),
        entity.getStartDate(),
        entity.getEndDate(),
        entity.getCreatedBy(),
        entity.getDateOfUpload().toInstant()
    );
  }

  /**
   * Converts a district volume entity into a detailed DTO representation.
   *
   * <p>The table data payload is mapped according to the entity area:
   *
   * <ul>
   *   <li>{@code INTERIOR} → {@link InteriorDataDto}
   *   <li>{@code COASTAL} → {@link CoastDataDto}
   * </ul>
   *
   * @param entity source entity
   * @return mapped detail DTO
   */
  public static DistrictVolumeDetailDto toDetailDto(DistrictVolumeEntity entity) {
    TableDataDto tableDataDto = switch (entity.getArea()) {
      case INTERIOR -> toInteriorDto(entity.getTableData());
      case COASTAL -> toCoastDto(entity.getTableData());
    };

    return new DistrictVolumeDetailDto(
        entity.getId(),
        entity.getArea().name(),
        entity.getStartDate(),
        entity.getEndDate(),
        entity.getCreatedBy(),
        entity.getDateOfUpload().toInstant(),
        entity.getTableLevelFactor(),
        entity.getHeliMultiplier(),
        tableDataDto
    );
  }

  /**
   * Creates a new entity from a district volume creation DTO.
   *
   * <p>Numeric values are normalized to three decimal places before being
   * stored in the entity.
   *
   * @param dto source creation DTO
   * @return newly populated entity
   */
  public static DistrictVolumeEntity toEntity(DistrictVolumeCreateDto dto) {
    var entity = new DistrictVolumeEntity();
    entity.setArea(Area.valueOf(dto.area()));
    entity.setStartDate(dto.startDate());
    entity.setTableLevelFactor(scale(dto.tableLevelFactor()));
    entity.setHeliMultiplier(
        dto.heliMultiplier() != null ? scale(dto.heliMultiplier()) : null
    );
    entity.setTableData(toEntityTableData(dto.tableData()));
    return entity;
  }
  
  private static InteriorDataDto toInteriorDto(TableData data) {
    List<InteriorZoneDto> zones = data.zones().stream()
        .map(zone -> new InteriorZoneDto(
            zone.name(),
            zone.districts().stream()
                .map(DistrictVolumeMapper::toInteriorRowDto)
                .toList()
        ))
        .toList();

    return new InteriorDataDto(zones, data.formulas());
  }

  private static CoastDataDto toCoastDto(TableData data) {
    List<CoastSectionDto> sections = data.sections().stream()
        .map(section -> new CoastSectionDto(
            section.name(),
            section.districts().stream()
                .map(DistrictVolumeMapper::toCoastRowDto)
                .toList()
        ))
        .toList();

    return new CoastDataDto(sections, data.formulas());
  }

  private static InteriorDistrictRowDto toInteriorRowDto(DistrictRow row) {
    return new InteriorDistrictRowDto(
        row.district().code(),
        scale(row.avoidableSawlog()),
        scale(row.avoidableGrade4()),
        scale(row.unavoidableGrade4()),
        scale(row.total())
    );
  }

  private static CoastDistrictRowDto toCoastRowDto(DistrictRow row) {
    return new CoastDistrictRowDto(
        row.district().code(),
        scale(row.avoidableSawlog()),
        scale(row.avoidableHembalGradeU()),
        scale(row.avoidableGradeY()),
        scale(row.unavoidable()),
        scale(row.total())
    );
  }

  /**
   * Maps the polymorphic table data DTO hierarchy into the entity's
   * JSONB-backed table data model.
   *
   * <p>This method pattern-matches on the sealed {@link TableDataDto}
   * hierarchy. The compiler enforces exhaustiveness, ensuring that new DTO
   * subtypes must be explicitly handled when introduced.
   *
   * <p>Missing formula maps are converted to an empty map.
   *
   * @param dto source table data DTO
   * @return mapped table data record
   */
  public static TableData toEntityTableData(TableDataDto dto) {
    return switch (dto) {
      
      case InteriorDataDto(var zones, var formulas) -> new TableData(
          zones.stream()
              .map(z -> new Zone(
                  z.name(),
                  z.districts().stream()
                      .map(r -> new DistrictRow(
                          new CodeDescriptionDto(r.code(), null),
                          scale(r.avoidableSawlog()),
                          scale(r.avoidableGrade4()),
                          scale(r.unavoidableGrade4()),
                          null,
                          null,
                          null,
                          scale(r.total())
                      ))
                      .toList()
              ))
              .toList(),
          null,
          formulas == null ? Map.of() : formulas
      );

      case CoastDataDto(var sections, var formulas) -> new TableData(
          null,
          sections.stream()
              .map(s -> new Section(
                  s.name(),
                  s.districts().stream()
                      .map(r -> new DistrictRow(
                          new CodeDescriptionDto(r.code(), null),
                          scale(r.avoidableSawlog()),
                          null,
                          null,
                          scale(r.avoidableHembalGradeU()),
                          scale(r.avoidableGradeY()),
                          scale(r.unavoidable()),
                          scale(r.total())
                      ))
                      .toList()
              ))
              .toList(),
          formulas == null ? Map.of() : formulas
      );
    };
  }

  private static BigDecimal scale(BigDecimal value) {
    return value == null ? null : value.setScale(3, RoundingMode.HALF_UP);
  }
}
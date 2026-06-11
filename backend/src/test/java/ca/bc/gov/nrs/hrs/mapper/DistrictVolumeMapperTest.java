package ca.bc.gov.nrs.hrs.mapper;

import static org.assertj.core.api.Assertions.assertThat;
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
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictRow;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Section;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Zone;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DistrictVolumeMapperTest {

  private static final OffsetDateTime MOCK_UPLOAD_TIME = 
      OffsetDateTime.of(2026, Month.JUNE.getValue(), 1, 12, 0, 0, 0, ZoneOffset.UTC);

  @Test
  @DisplayName("Should map Entity to ListItemDto correctly")
  void testToListItemDto() {
    // Arrange
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setId(100L);
    entity.setArea(Area.INTERIOR);
    entity.setStartDate(LocalDate.of(2025, Month.JANUARY, 1));
    entity.setCreatedBy("TEST_USER");
    entity.setDateOfUpload(MOCK_UPLOAD_TIME);

    // Act
    DistrictVolumeListItemDto dto = DistrictVolumeMapper.toListItemDto(entity);

    // Assert
    assertThat(dto).isNotNull();
    assertThat(dto.id()).isEqualTo(100L);
    assertThat(dto.area()).isEqualTo("INTERIOR");
    assertThat(dto.startDate()).isEqualTo(LocalDate.of(2025, Month.JANUARY, 1));
    assertThat(dto.uploadedBy()).isEqualTo("TEST_USER");
    assertThat(dto.dateOfUpload()).isNotNull();
  }

  @Test
  @DisplayName("Should map Interior Entity to DetailDto correctly")
  void testToDetailDto_Interior() {
    // Arrange
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setId(1L);
    entity.setArea(Area.INTERIOR);
    entity.setStartDate(LocalDate.of(2026, Month.MAY, 1));
    entity.setTableLevelFactor(new BigDecimal("1.15"));
    entity.setCreatedBy("IDIR\\JSMITH");
    entity.setDateOfUpload(MOCK_UPLOAD_TIME);

    TableData mockTableData =
        new TableData(Collections.emptyList(), null, Collections.emptyMap());
    entity.setTableData(mockTableData);

    // Act
    DistrictVolumeDetailDto dto = DistrictVolumeMapper.toDetailDto(entity);

    // Assert
    assertThat(dto).isNotNull();
    assertThat(dto.tableLevelFactor()).isEqualByComparingTo("1.15");
    assertThat(dto.tableData()).isInstanceOf(InteriorDataDto.class);
  }

  @Test
  @DisplayName("Should map Coastal Entity to DetailDto correctly including heliMultiplier")
  void testToDetailDto_Coastal() {
    // Arrange
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setId(2L);
    entity.setArea(Area.COASTAL);
    entity.setStartDate(LocalDate.of(2026, Month.JUNE, 1));
    entity.setTableLevelFactor(new BigDecimal("1.05"));
    entity.setHeliMultiplier(new BigDecimal("1.50"));
    entity.setCreatedBy("IDIR\\JSMITH");
    entity.setDateOfUpload(MOCK_UPLOAD_TIME);

    TableData mockTableData =
        new TableData(null, Collections.emptyList(), Collections.emptyMap());
    entity.setTableData(mockTableData);

    // Act
    DistrictVolumeDetailDto dto = DistrictVolumeMapper.toDetailDto(entity);

    // Assert
    assertThat(dto).isNotNull();
    assertThat(dto.tableLevelFactor()).isEqualByComparingTo("1.05");
    assertThat(dto.heliMultiplier()).isEqualByComparingTo("1.50");
    assertThat(dto.tableData()).isInstanceOf(CoastDataDto.class);
  }

  @Test
  @DisplayName("Should map Interior TableDataDto to Entity TableData")
  void testToEntityTableData_Interior() {
    // Arrange
    InteriorDataDto interiorDto =
        new InteriorDataDto(Collections.emptyList(), Collections.emptyMap());

    // Act
    TableData tableData = DistrictVolumeMapper.toEntityTableData(interiorDto);

    // Assert
    assertThat(tableData).isNotNull();
    assertThat(tableData.zones()).isNotNull();
  }

  @Test
  @DisplayName("Should map Coastal TableDataDto to Entity TableData")
  void testToEntityTableData_Coastal() {
    // Arrange
    CoastDataDto coastDto =
        new CoastDataDto(Collections.emptyList(), Collections.emptyMap());

    // Act
    TableData tableData = DistrictVolumeMapper.toEntityTableData(coastDto);

    // Assert
    assertThat(tableData).isNotNull();
    assertThat(tableData.sections()).isNotNull();
  }

  @Test
  @DisplayName("Should map Interior entity with real district rows to DetailDto with scaled values")
  void testToDetailDto_Interior_withDistricts() {

    // Arrange
    DistrictRow row = new DistrictRow(
        new CodeDescriptionDto("DPG", "Prince George"),
        new BigDecimal("10.5"),
        new BigDecimal("2.0"),
        new BigDecimal("1.0"),
        null, null, null,
        new BigDecimal("13.5")
    );
    Zone zone = new Zone("Dry belt", List.of(row));
    TableData tableData = new TableData(List.of(zone), null, Collections.emptyMap());

    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setId(10L);
    entity.setArea(Area.INTERIOR);
    entity.setStartDate(LocalDate.of(2026, Month.MARCH, 1));
    entity.setTableLevelFactor(new BigDecimal("1.200"));
    entity.setCreatedBy("MAPPER_TEST");
    entity.setDateOfUpload(OffsetDateTime.now());
    entity.setTableData(tableData);

    // Act
    DistrictVolumeDetailDto dto = DistrictVolumeMapper.toDetailDto(entity);

    // Assert
    assertThat(dto.tableData()).isInstanceOf(InteriorDataDto.class);
    InteriorDataDto interiorDto = (InteriorDataDto) dto.tableData();
    assertThat(interiorDto.zones()).hasSize(1);
    assertThat(interiorDto.zones().get(0).name()).isEqualTo("Dry belt");

    InteriorDistrictRowDto rowDto = interiorDto.zones().get(0).districts().get(0);
    assertThat(rowDto.code()).isEqualTo("DPG");
    assertThat(rowDto.avoidableSawlog()).isEqualByComparingTo("10.500");
    assertThat(rowDto.avoidableGrade4()).isEqualByComparingTo("2.000");
    assertThat(rowDto.unavoidableGrade4()).isEqualByComparingTo("1.000");
    assertThat(rowDto.total()).isEqualByComparingTo("13.500");
  }

  @Test
  @DisplayName("Should map Coastal entity with real district rows to DetailDto with scaled values")
  void testToDetailDto_Coastal_withDistricts() {

    // Arrange
    DistrictRow row = new DistrictRow(
        new CodeDescriptionDto("DCC", "Chilliwack"),
        new BigDecimal("5.5"),
        null, null,
        new BigDecimal("1.2"),
        new BigDecimal("0.8"),
        new BigDecimal("0.5"),
        new BigDecimal("8.0")
    );
    Section section = new Section("Mature", List.of(row));
    TableData tableData = new TableData(null, List.of(section), Collections.emptyMap());

    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setId(20L);
    entity.setArea(Area.COASTAL);
    entity.setStartDate(LocalDate.of(2026, Month.APRIL, 1));
    entity.setTableLevelFactor(new BigDecimal("1.050"));
    entity.setHeliMultiplier(new BigDecimal("1.500"));
    entity.setCreatedBy("MAPPER_TEST");
    entity.setDateOfUpload(OffsetDateTime.now());
    entity.setTableData(tableData);

    // Act
    DistrictVolumeDetailDto dto = DistrictVolumeMapper.toDetailDto(entity);

    // Assert
    assertThat(dto.tableData()).isInstanceOf(CoastDataDto.class);
    CoastDataDto coastDto = (CoastDataDto) dto.tableData();
    assertThat(coastDto.sections()).hasSize(1);
    assertThat(coastDto.sections().get(0).name()).isEqualTo("Mature");

    CoastDistrictRowDto rowDto = coastDto.sections().get(0).districts().get(0);
    assertThat(rowDto.code()).isEqualTo("DCC");
    assertThat(rowDto.avoidableSawlog()).isEqualByComparingTo("5.500");
    assertThat(rowDto.avoidableHembalGradeU()).isEqualByComparingTo("1.200");
    assertThat(rowDto.avoidableGradeY()).isEqualByComparingTo("0.800");
    assertThat(rowDto.unavoidable()).isEqualByComparingTo("0.500");
    assertThat(rowDto.total()).isEqualByComparingTo("8.000");
  }

  @Test
  @DisplayName("Should map Interior CreateDto to Entity via toEntity()")
  void testToEntity_Interior() {

    // Arrange
    InteriorDataDto interiorDto =
        new InteriorDataDto(Collections.emptyList(), Collections.emptyMap());
    DistrictVolumeCreateDto createDto = new DistrictVolumeCreateDto(
        "INTERIOR",
        LocalDate.of(2027, Month.JANUARY, 1),
        new BigDecimal("1.100"),
        null,
        interiorDto
    );

    // Act
    DistrictVolumeEntity entity = DistrictVolumeMapper.toEntity(createDto);

    // Assert
    assertThat(entity.getArea()).isEqualTo(Area.INTERIOR);
    assertThat(entity.getStartDate()).isEqualTo(LocalDate.of(2027, Month.JANUARY, 1));
    assertThat(entity.getTableLevelFactor()).isEqualByComparingTo("1.100");
    assertThat(entity.getHeliMultiplier()).isNull();
    assertThat(entity.getTableData()).isNotNull();
    assertThat(entity.getTableData().zones()).isNotNull();
  }

  @Test
  @DisplayName("Should map Coastal CreateDto with heliMultiplier to Entity via toEntity()")
  void testToEntity_Coastal_withHeliMultiplier() {

    // Arrange
    CoastDataDto coastDto =
        new CoastDataDto(Collections.emptyList(), Collections.emptyMap());
    DistrictVolumeCreateDto createDto = new DistrictVolumeCreateDto(
        "COASTAL",
        LocalDate.of(2027, Month.JUNE, 1),
        new BigDecimal("1.050"),
        new BigDecimal("1.750"),
        coastDto
    );

    // Act
    DistrictVolumeEntity entity = DistrictVolumeMapper.toEntity(createDto);

    // Assert
    assertThat(entity.getArea()).isEqualTo(Area.COASTAL);
    assertThat(entity.getTableLevelFactor()).isEqualByComparingTo("1.050");
    assertThat(entity.getHeliMultiplier()).isEqualByComparingTo("1.750");
    assertThat(entity.getTableData()).isNotNull();
    assertThat(entity.getTableData().sections()).isNotNull();
  }

  @Test
  @DisplayName("Should map Coastal CreateDto with null heliMultiplier — entity field is null")
  void testToEntity_Coastal_nullHeliMultiplier() {

    // Arrange
    CoastDataDto coastDto =
        new CoastDataDto(Collections.emptyList(), Collections.emptyMap());
    DistrictVolumeCreateDto createDto = new DistrictVolumeCreateDto(
        "COASTAL",
        LocalDate.of(2027, Month.JUNE, 1),
        new BigDecimal("1.000"),
        null,
        coastDto
    );

    // Act
    DistrictVolumeEntity entity = DistrictVolumeMapper.toEntity(createDto);

    // Assert
    assertThat(entity.getHeliMultiplier()).isNull();
  }

  @Test
  @DisplayName("Should map Interior EntityTableData with populated zones via toEntityTableData()")
  void testToEntityTableData_Interior_withData() {

    // Arrange
    InteriorDistrictRowDto rowDto = new InteriorDistrictRowDto(
        "DPG",
        new BigDecimal("10.0"),
        new BigDecimal("2.0"),
        new BigDecimal("1.0"),
        new BigDecimal("13.0")
    );
    InteriorZoneDto zoneDto = new InteriorZoneDto("Wet belt", List.of(rowDto));
    InteriorDataDto interiorDto =
        new InteriorDataDto(List.of(zoneDto), Collections.emptyMap());

    // Act
    TableData tableData = DistrictVolumeMapper.toEntityTableData(interiorDto);

    // Assert
    assertThat(tableData.zones()).hasSize(1);
    assertThat(tableData.zones().get(0).name()).isEqualTo("Wet belt");
    assertThat(tableData.zones().get(0).districts()).hasSize(1);
    assertThat(tableData.zones().get(0).districts().get(0).district().code()).isEqualTo("DPG");
    assertThat(tableData.zones().get(0).districts().get(0).avoidableSawlog())
        .isEqualByComparingTo("10.000");
  }

  @Test
  @DisplayName("Should map Coastal EntityTableData with populated sections via toEntityTableData()")
  void testToEntityTableData_Coastal_withData() {

    // Arrange
    CoastDistrictRowDto rowDto = new CoastDistrictRowDto(
        "DCC",
        new BigDecimal("5.0"),
        new BigDecimal("1.0"),
        new BigDecimal("0.5"),
        new BigDecimal("0.3"),
        new BigDecimal("6.8")
    );
    CoastSectionDto sectionDto = new CoastSectionDto("Immature", List.of(rowDto));
    CoastDataDto coastDto =
        new CoastDataDto(List.of(sectionDto), Collections.emptyMap());

    // Act
    TableData tableData = DistrictVolumeMapper.toEntityTableData(coastDto);

    // Assert
    assertThat(tableData.sections()).hasSize(1);
    assertThat(tableData.sections().get(0).name()).isEqualTo("Immature");
    assertThat(tableData.sections().get(0).districts()).hasSize(1);
    assertThat(tableData.sections().get(0).districts().get(0).district().code()).isEqualTo("DCC");
    assertThat(tableData.sections().get(0).districts().get(0).avoidableHembalGradeU())
        .isEqualByComparingTo("1.000");
  }

  @Test
  @DisplayName("Should handle null BigDecimal fields in Interior district row — scale returns null")
  void testToDetailDto_Interior_nullDistrictFields_scaleReturnsNull() {

    // Arrange — row with null numeric fields (only district code is set)
    DistrictRow row = new DistrictRow(
        new CodeDescriptionDto("DPG", null),
        null, // avoidableSawlog
        null, // avoidableGrade4
        null, // unavoidableGrade4
        null, null, null,
        null  // total
    );
    Zone zone = new Zone("Dry belt", List.of(row));
    TableData tableData = new TableData(List.of(zone), null, Collections.emptyMap());

    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setId(30L);
    entity.setArea(Area.INTERIOR);
    entity.setStartDate(LocalDate.of(2026, Month.JANUARY, 1));
    entity.setTableLevelFactor(new BigDecimal("1.000"));
    entity.setCreatedBy("TESTER");
    entity.setDateOfUpload(OffsetDateTime.now(ZoneOffset.UTC));
    entity.setTableData(tableData);

    // Act
    DistrictVolumeDetailDto dto = DistrictVolumeMapper.toDetailDto(entity);

    // Assert — null fields survive the mapping
    InteriorDataDto interiorDto = (InteriorDataDto) dto.tableData();
    InteriorDistrictRowDto rowDto = interiorDto.zones().get(0).districts().get(0);
    assertThat(rowDto.avoidableSawlog()).isNull();
    assertThat(rowDto.avoidableGrade4()).isNull();
    assertThat(rowDto.total()).isNull();
  }
}


package ca.bc.gov.nrs.hrs.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
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
}
package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | District Volume Service")
class DistrictVolumeServiceTest {

  private static final OffsetDateTime MOCK_UPLOAD_TIME =
      OffsetDateTime.of(
          2026,
          Month.JANUARY.getValue(),
          1,
          12,
          0,
          0,
          0,
          ZoneOffset.UTC);

  private static final LocalDate MOCK_START_DATE =
      LocalDate.of(2026, Month.FEBRUARY, 1);

  @Mock
  private DistrictVolumeRepository districtVolumeRepository;

  @InjectMocks
  private DistrictVolumeService districtVolumeService;

  private DistrictVolumeEntity buildEntity(Area area) {
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setId(1L);
    entity.setArea(area);
    entity.setStartDate(LocalDate.of(2026, Month.JANUARY, 1));
    entity.setTableLevelFactor(new BigDecimal("1.000"));
    entity.setCreatedBy("TEST_USER");
    entity.setDateOfUpload(MOCK_UPLOAD_TIME);

    TableData tableData =
        area == Area.INTERIOR
            ? new TableData(
                Collections.emptyList(),
                null,
                Collections.emptyMap())
            : new TableData(
                null,
                Collections.emptyList(),
                Collections.emptyMap());

    entity.setTableData(tableData);
    return entity;
  }

  @Test
  @DisplayName("getDistrictVolumes — should return mapped page from repository")
  void getDistrictVolumes_returnsMappedPage() {
    // Arrange
    DistrictVolumeEntity entity = buildEntity(Area.INTERIOR);
    PageRequest pageable = PageRequest.of(0, 10);

    when(districtVolumeRepository.findAll(pageable))
        .thenReturn(new PageImpl<>(List.of(entity), pageable, 1));

    // Act
    var result = districtVolumeService.getDistrictVolumes(pageable);

    // Assert
    assertThat(result).isNotNull();
    assertThat(result.getTotalElements()).isEqualTo(1);
    assertThat(result.getContent()).hasSize(1);
    assertThat(result.getContent().get(0).area()).isEqualTo("INTERIOR");
  }

  @Test
  @DisplayName("getDistrictVolumeById — should return detail DTO when entity found")
  void getDistrictVolumeById_returnsDetailDto_whenFound() {
    // Arrange
    DistrictVolumeEntity entity = buildEntity(Area.INTERIOR);

    when(districtVolumeRepository.findById(1L))
        .thenReturn(Optional.of(entity));

    // Act
    DistrictVolumeDetailDto result =
        districtVolumeService.getDistrictVolumeById(1L);

    // Assert
    assertThat(result).isNotNull();
    assertThat(result.id()).isEqualTo(1L);
    assertThat(result.area()).isEqualTo("INTERIOR");
  }

  @Test
  @DisplayName("getDistrictVolumeById — should throw 404 when entity not found")
  void getDistrictVolumeById_throws404_whenNotFound() {
    // Arrange
    when(districtVolumeRepository.findById(99L))
        .thenReturn(Optional.empty());

    // Act & Assert
    assertThatThrownBy(
            () -> districtVolumeService.getDistrictVolumeById(99L))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("District volume record not found");
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should throw 400 when "
          + "InteriorDataDto used with area=COASTAL")
  void createDistrictVolume_throws400_whenInteriorDataWithCoastalArea() {
    // Arrange
    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "COASTAL",
            MOCK_START_DATE,
            new BigDecimal("1.000"),
            new BigDecimal("1.500"),
            interiorData);

    // Act & Assert
    assertThatThrownBy(
            () -> districtVolumeService.createDistrictVolume(createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Area mismatch: Expected INTERIOR data layout.");
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should throw 400 when "
          + "CoastDataDto used with area=INTERIOR")
  void createDistrictVolume_throws400_whenCoastalDataWithInteriorArea() {
    // Arrange
    CoastDataDto coastData =
        new CoastDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            MOCK_START_DATE,
            new BigDecimal("1.000"),
            null,
            coastData);

    // Act & Assert
    assertThatThrownBy(
            () -> districtVolumeService.createDistrictVolume(createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Area mismatch: Expected COASTAL data layout.");
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should throw 400 when "
          + "CoastDataDto has no heliMultiplier")
  void createDistrictVolume_throws400_whenCoastalDataMissingHeliMultiplier() {
    // Arrange
    CoastDataDto coastData =
        new CoastDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "COASTAL",
            MOCK_START_DATE,
            new BigDecimal("1.000"),
            null,
            coastData);

    // Act & Assert
    assertThatThrownBy(
            () -> districtVolumeService.createDistrictVolume(createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("Missing helicopter multiplier");
  }
}
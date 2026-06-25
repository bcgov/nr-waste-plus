package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
import java.time.LocalDateTime;
import java.time.Month;
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

  private static final LocalDateTime MOCK_UPLOAD_TIME =
      LocalDateTime.of(
          2026,
          Month.JANUARY,
          1,
          12,
          0,
          0);

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
  @DisplayName(
      "getDistrictVolumes — should return mapped page from repository "
          + "when no filter provided")
  void getDistrictVolumes_returnsMappedPage() {

    DistrictVolumeEntity entity = buildEntity(Area.INTERIOR);
    PageRequest pageable = PageRequest.of(0, 10);

    when(districtVolumeRepository.findAll(pageable))
        .thenReturn(new PageImpl<>(List.of(entity), pageable, 1));

    var result =
        districtVolumeService.getDistrictVolumes(Optional.empty(), pageable);

    assertThat(result).isNotNull();
    assertThat(result.getTotalElements()).isEqualTo(1);
    assertThat(result.getContent()).hasSize(1);
    assertThat(result.getContent().get(0).area()).isEqualTo("INTERIOR");
  }

  @Test
  @DisplayName(
      "getDistrictVolumes — should return filtered page when area filter is provided")
  void getDistrictVolumes_returnsFilteredPage_whenAreaProvided() {

    DistrictVolumeEntity entity = buildEntity(Area.INTERIOR);
    PageRequest pageable = PageRequest.of(0, 10);

    when(districtVolumeRepository.findByArea(Area.INTERIOR, pageable))
        .thenReturn(new PageImpl<>(List.of(entity), pageable, 1));

    var result =
        districtVolumeService.getDistrictVolumes(
            Optional.of("INTERIOR"),
            pageable);

    assertThat(result).isNotNull();
    assertThat(result.getTotalElements()).isEqualTo(1);
    assertThat(result.getContent().get(0).area()).isEqualTo("INTERIOR");
  }

  @Test
  @DisplayName(
      "getDistrictVolumeById — should return detail DTO when entity found")
  void getDistrictVolumeById_returnsDetailDto_whenFound() {

    DistrictVolumeEntity entity = buildEntity(Area.INTERIOR);

    when(districtVolumeRepository.findById(1L))
        .thenReturn(Optional.of(entity));

    DistrictVolumeDetailDto result =
        districtVolumeService.getDistrictVolumeById(1L);

    assertThat(result).isNotNull();
    assertThat(result.id()).isEqualTo(1L);
    assertThat(result.area()).isEqualTo("INTERIOR");
  }

  @Test
  @DisplayName(
      "getDistrictVolumeById — should throw 404 when entity not found")
  void getDistrictVolumeById_throws404_whenNotFound() {

    when(districtVolumeRepository.findById(99L))
        .thenReturn(Optional.empty());

    assertThatThrownBy(
            () -> districtVolumeService.getDistrictVolumeById(99L))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("District volume record not found");
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should throw 400 when InteriorDataDto used "
          + "with area=COASTAL")
  void createDistrictVolume_throws400_whenInteriorDataWithCoastalArea() {

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

    assertThatThrownBy(
            () -> districtVolumeService.createDistrictVolume(
                "TEST_USER",
                createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Area mismatch: Expected INTERIOR data layout.");
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should throw 400 when CoastDataDto used "
          + "with area=INTERIOR")
  void createDistrictVolume_throws400_whenCoastalDataWithInteriorArea() {

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

    assertThatThrownBy(
            () -> districtVolumeService.createDistrictVolume(
                "TEST_USER",
                createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Area mismatch: Expected COASTAL data layout.");
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should throw 400 when CoastDataDto has no "
          + "heliMultiplier")
  void createDistrictVolume_throws400_whenCoastalDataMissingHeliMultiplier() {

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

    assertThatThrownBy(
            () -> districtVolumeService.createDistrictVolume(
                "TEST_USER",
                createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("Missing helicopter multiplier");
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should throw 400 when area string is unrecognized")
  void createDistrictVolume_throws400_whenAreaIsInvalid() {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "UNKNOWN_AREA",
            LocalDate.of(9999, Month.JANUARY, 1),
            new BigDecimal("1.000"),
            null,
            interiorData);

    assertThatThrownBy(
            () -> districtVolumeService.createDistrictVolume(
                "TEST_USER",
                createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Invalid area: UNKNOWN_AREA. Must be INTERIOR or COASTAL.");
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should throw 400 when tableData payload is missing")
  void createDistrictVolume_throws400_whenTableDataIsNull() {

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            LocalDate.of(9999, Month.JANUARY, 1),
            new BigDecimal("1.000"),
            null,
            null);

    assertThatThrownBy(
            () -> districtVolumeService.createDistrictVolume(
                "TEST_USER",
                createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Invalid or missing table data payload structure.");
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should throw 422 when start date is in the past")
  void createDistrictVolume_throws422_whenStartDateIsInPast() {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            LocalDate.of(2000, Month.JANUARY, 1),
            new BigDecimal("1.000"),
            null,
            interiorData);

    assertThatThrownBy(
            () -> districtVolumeService.createDistrictVolume(
                "TEST_USER",
                createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Start date must be strictly after today.");
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should save and return mapped DTO for "
          + "valid INTERIOR payload")
  void createDistrictVolume_returnsMappedDto_whenInteriorIsValid() {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            LocalDate.of(9999, Month.JANUARY, 1),
            new BigDecimal("1.150"),
            null,
            interiorData);

    DistrictVolumeEntity savedEntity = buildEntity(Area.INTERIOR);
    savedEntity.setTableLevelFactor(new BigDecimal("1.150"));

    when(districtVolumeRepository.save(any(DistrictVolumeEntity.class)))
        .thenReturn(savedEntity);

    DistrictVolumeDetailDto result =
        districtVolumeService.createDistrictVolume(
            "TEST_USER",
            createDto);

    assertThat(result).isNotNull();
    assertThat(result.area()).isEqualTo("INTERIOR");
    assertThat(result.tableLevelFactor())
        .isEqualTo(new BigDecimal("1.150"));
  }

  @Test
  @DisplayName(
      "createDistrictVolume — should save and return mapped DTO for valid COASTAL payload")
  void createDistrictVolume_returnsMappedDto_whenCoastalIsValid() {

    CoastDataDto coastData =
        new CoastDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "COASTAL",
            LocalDate.of(9999, Month.JANUARY, 1),
            new BigDecimal("1.200"),
            new BigDecimal("1.500"),
            coastData);

    DistrictVolumeEntity savedEntity = buildEntity(Area.COASTAL);
    savedEntity.setTableLevelFactor(new BigDecimal("1.200"));
    savedEntity.setHeliMultiplier(new BigDecimal("1.500"));

    when(districtVolumeRepository.save(
            any(DistrictVolumeEntity.class)))
        .thenReturn(savedEntity);

    DistrictVolumeDetailDto result =
        districtVolumeService.createDistrictVolume(
            "TEST_USER",
            createDto);

    assertThat(result).isNotNull();
    assertThat(result.area()).isEqualTo("COASTAL");
    assertThat(result.tableLevelFactor())
        .isEqualTo(new BigDecimal("1.200"));
    assertThat(result.heliMultiplier())
        .isEqualTo(new BigDecimal("1.500"));
  }
}
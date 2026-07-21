package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Species Composition Service")
class SpeciesCompositionServiceTest {

  private static final LocalDateTime MOCK_UPLOAD_TIME =
      LocalDateTime.of(2026, Month.JANUARY, 1, 12, 0, 0);

  @Mock
  private DistrictVolumeRepository districtVolumeRepository;

  @InjectMocks
  private SpeciesCompositionService speciesCompositionService;

  private DistrictVolumeEntity buildEntity(Area area) {
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setId(1L);
    entity.setArea(area);
    entity.setConfigType(ConfigType.SPECIES_COMPOSITION);
    entity.setStartDate(LocalDate.of(2026, Month.JANUARY, 1));
    entity.setTableLevelFactor(new BigDecimal("1.000"));
    entity.setCreatedBy("TEST_USER");
    entity.setDateOfUpload(MOCK_UPLOAD_TIME);

    TableData tableData =
        area == Area.INTERIOR
            ? new TableData(
                Collections.emptyList(),
                null,
                null,
                Collections.emptyMap())
            : new TableData(
                null,
                Collections.emptyList(),
                null,
                Collections.emptyMap());

    entity.setTableData(tableData);
    return entity;
  }

  @Test
  @DisplayName(
      "getSpeciesCompositions — should return mapped page from repository "
          + "when no filter provided")
  void getSpeciesCompositions_returnsMappedPage() {

    DistrictVolumeEntity entity = buildEntity(Area.INTERIOR);
    PageRequest pageable = PageRequest.of(0, 10);

    when(districtVolumeRepository.findAllByConfigType(
            ConfigType.SPECIES_COMPOSITION, pageable))
        .thenReturn(new PageImpl<>(List.of(entity), pageable, 1));

    var result =
        speciesCompositionService.getSpeciesCompositions(Optional.empty(), pageable);

    assertThat(result).isNotNull();
    assertThat(result.getTotalElements()).isEqualTo(1);
    assertThat(result.getContent()).hasSize(1);
    assertThat(result.getContent().get(0).area()).isEqualTo("INTERIOR");
  }

  @Test
  @DisplayName(
      "getSpeciesCompositions — should return filtered page when area filter is provided")
  void getSpeciesCompositions_returnsFilteredPage_whenAreaProvided() {

    DistrictVolumeEntity entity = buildEntity(Area.COASTAL);
    PageRequest pageable = PageRequest.of(0, 10);

    when(districtVolumeRepository.findAllByConfigTypeAndArea(
            ConfigType.SPECIES_COMPOSITION, Area.COASTAL, pageable))
        .thenReturn(new PageImpl<>(List.of(entity), pageable, 1));

    var result =
        speciesCompositionService.getSpeciesCompositions(
            Optional.of("COASTAL"),
            pageable);

    assertThat(result).isNotNull();
    assertThat(result.getTotalElements()).isEqualTo(1);
    assertThat(result.getContent().get(0).area()).isEqualTo("COASTAL");
  }

  @Test
  @DisplayName(
      "getSpeciesCompositionById — should return detail DTO when entity found")
  void getSpeciesCompositionById_returnsDetailDto_whenFound() {

    DistrictVolumeEntity entity = buildEntity(Area.INTERIOR);

    when(districtVolumeRepository.findByIdAndConfigType(1L, ConfigType.SPECIES_COMPOSITION))
        .thenReturn(Optional.of(entity));

    DistrictVolumeDetailDto result =
        speciesCompositionService.getSpeciesCompositionById(1L);

    assertThat(result).isNotNull();
    assertThat(result.id()).isEqualTo(1L);
    assertThat(result.area()).isEqualTo("INTERIOR");
  }

  @Test
  @DisplayName(
      "getSpeciesCompositionById — should throw 404 when entity not found")
  void getSpeciesCompositionById_throws404_whenNotFound() {

    when(districtVolumeRepository.findByIdAndConfigType(99L, ConfigType.SPECIES_COMPOSITION))
        .thenReturn(Optional.empty());

    assertThatThrownBy(
          () -> speciesCompositionService.getSpeciesCompositionById(99L))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("Species composition record not found");
  }

  @Test
  @DisplayName(
      "createSpeciesComposition — should throw 400 when InteriorDataDto used "
          + "with area=COASTAL")
  void createSpeciesComposition_throws400_whenInteriorDataWithCoastalArea() {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "COASTAL",
            LocalDate.now().plusDays(10),
            new BigDecimal("1.000"),
            new BigDecimal("1.500"),
            interiorData);

    assertThatThrownBy(
          () -> speciesCompositionService.createSpeciesComposition(
              "TEST_USER",
              createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Area mismatch: Expected INTERIOR data layout.");
  }

  @Test
  @DisplayName(
      "createSpeciesComposition — should throw 400 when CoastDataDto used "
          + "with area=INTERIOR")
  void createSpeciesComposition_throws400_whenCoastalDataWithInteriorArea() {

    CoastDataDto coastData =
        new CoastDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            LocalDate.now().plusDays(10),
            new BigDecimal("1.000"),
            null,
            coastData);

    assertThatThrownBy(
          () -> speciesCompositionService.createSpeciesComposition(
              "TEST_USER",
              createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Area mismatch: Expected COASTAL data layout.");
  }

  @Test
  @DisplayName(
      "createSpeciesComposition — should throw 400 when area string is unrecognized")
  void createSpeciesComposition_throws400_whenAreaIsInvalid() {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "UNKNOWN_AREA",
            LocalDate.now().plusDays(10),
            new BigDecimal("1.000"),
            null,
            interiorData);

    assertThatThrownBy(
          () -> speciesCompositionService.createSpeciesComposition(
              "TEST_USER",
              createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Invalid area: UNKNOWN_AREA. Must be INTERIOR or COASTAL.");
  }

  @Test
  @DisplayName(
      "createSpeciesComposition — should throw 400 when tableData payload is missing")
  void createSpeciesComposition_throws400_whenTableDataIsNull() {

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            LocalDate.now().plusDays(10),
            new BigDecimal("1.000"),
            null,
            null);

    assertThatThrownBy(
          () -> speciesCompositionService.createSpeciesComposition(
              "TEST_USER",
              createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Invalid or missing table data payload structure.");
  }

  @Test
  @DisplayName(
      "createSpeciesComposition — should throw 422 when start date is in the past")
  void createSpeciesComposition_throws422_whenStartDateIsInPast() {

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
          () -> speciesCompositionService.createSpeciesComposition(
              "TEST_USER",
              createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Start date must be strictly after today.");
  }

  @Test
  @DisplayName(
      "createSpeciesComposition — should save and return mapped DTO for "
          + "valid INTERIOR payload")
  void createSpeciesComposition_returnsMappedDto_whenInteriorIsValid() {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    LocalDate futureDate = LocalDate.now().plusDays(10);

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            futureDate,
            new BigDecimal("1.150"),
            null,
            interiorData);

    DistrictVolumeEntity savedEntity = buildEntity(Area.INTERIOR);
    savedEntity.setStartDate(futureDate);
    savedEntity.setTableLevelFactor(new BigDecimal("1.150"));

    when(districtVolumeRepository.findByConfigTypeAndAreaAndEndDateIsNullOrderByStartDateDesc(
            ConfigType.SPECIES_COMPOSITION, Area.INTERIOR))
        .thenReturn(Collections.emptyList());
    when(districtVolumeRepository.save(any(DistrictVolumeEntity.class)))
        .thenReturn(savedEntity);

    DistrictVolumeDetailDto result =
        speciesCompositionService.createSpeciesComposition(
            "TEST_USER",
            createDto);

    assertThat(result).isNotNull();
    assertThat(result.area()).isEqualTo("INTERIOR");
    assertThat(result.tableLevelFactor())
        .isEqualTo(new BigDecimal("1.150"));
  }

  @Test
  @DisplayName(
      "createSpeciesComposition — should close the existing open-ended row before saving the new row")
  void createSpeciesComposition_closesExistingOpenEndedRow_beforeSavingNewRow() {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    LocalDate newStartDate = LocalDate.now().plusDays(20);

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            newStartDate,
            new BigDecimal("1.150"),
            null,
            interiorData);

    DistrictVolumeEntity existingOpenEntry = buildEntity(Area.INTERIOR);
    existingOpenEntry.setStartDate(LocalDate.now().plusDays(5));
    existingOpenEntry.setEndDate(null);

    DistrictVolumeEntity savedEntity = buildEntity(Area.INTERIOR);
    savedEntity.setId(2L);
    savedEntity.setStartDate(newStartDate);
    savedEntity.setEndDate(null);
    savedEntity.setTableLevelFactor(new BigDecimal("1.150"));

    when(districtVolumeRepository.findByConfigTypeAndAreaAndEndDateIsNullOrderByStartDateDesc(
            ConfigType.SPECIES_COMPOSITION, Area.INTERIOR))
        .thenReturn(List.of(existingOpenEntry));
    when(districtVolumeRepository.save(any(DistrictVolumeEntity.class)))
        .thenReturn(existingOpenEntry, savedEntity);

    DistrictVolumeDetailDto result =
        speciesCompositionService.createSpeciesComposition(
            "TEST_USER",
            createDto);

    ArgumentCaptor<DistrictVolumeEntity> saveCaptor =
        ArgumentCaptor.forClass(DistrictVolumeEntity.class);

    verify(districtVolumeRepository)
        .findByConfigTypeAndAreaAndEndDateIsNullOrderByStartDateDesc(
            ConfigType.SPECIES_COMPOSITION, Area.INTERIOR);
    verify(districtVolumeRepository, org.mockito.Mockito.times(2))
        .save(saveCaptor.capture());

    List<DistrictVolumeEntity> savedEntities = saveCaptor.getAllValues();

    assertThat(savedEntities.get(0)).isSameAs(existingOpenEntry);
    assertThat(savedEntities.get(0).getEndDate())
        .isEqualTo(newStartDate.minusDays(1));

    assertThat(savedEntities.get(1).getArea()).isEqualTo(Area.INTERIOR);
    assertThat(savedEntities.get(1).getStartDate()).isEqualTo(newStartDate);
    assertThat(savedEntities.get(1).getEndDate()).isNull();
    assertThat(savedEntities.get(1).getCreatedBy()).isEqualTo("TEST_USER");
    assertThat(savedEntities.get(1).getConfigType())
        .isEqualTo(ConfigType.SPECIES_COMPOSITION);
    assertThat(savedEntities.get(1).getTableLevelFactor())
        .isEqualTo(new BigDecimal("1.150"));

    assertThat(result.id()).isEqualTo(2L);
    assertThat(result.startDate()).isEqualTo(newStartDate);
  }

  @Test
  @DisplayName(
      "createSpeciesComposition — should throw 422 when start date is not after existing open row")
  void createSpeciesComposition_throws422_whenStartDateNotAfterExistingOpenEndedRow() {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    LocalDate existingStartDate = LocalDate.now().plusDays(5);

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            existingStartDate,
            new BigDecimal("1.150"),
            null,
            interiorData);

    DistrictVolumeEntity existingOpenEntry = buildEntity(Area.INTERIOR);
    existingOpenEntry.setStartDate(existingStartDate);

    when(districtVolumeRepository.findByConfigTypeAndAreaAndEndDateIsNullOrderByStartDateDesc(
            ConfigType.SPECIES_COMPOSITION, Area.INTERIOR))
        .thenReturn(List.of(existingOpenEntry));

    assertThatThrownBy(
          () -> speciesCompositionService.createSpeciesComposition(
              "TEST_USER",
              createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "Start date must be after the most recent existing start date");

    verify(districtVolumeRepository, never()).save(any(DistrictVolumeEntity.class));
  }

  @Test
  @DisplayName(
      "createSpeciesComposition — should throw 409 when multiple open-ended rows exist for area")
  void createSpeciesComposition_throws409_whenMultipleOpenEndedRowsExist() {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            LocalDate.now().plusDays(30),
            new BigDecimal("1.150"),
            null,
            interiorData);

    DistrictVolumeEntity newestOpenEntry = buildEntity(Area.INTERIOR);
    newestOpenEntry.setStartDate(LocalDate.now().plusDays(15));

    DistrictVolumeEntity olderOpenEntry = buildEntity(Area.INTERIOR);
    olderOpenEntry.setId(2L);
    olderOpenEntry.setStartDate(LocalDate.now().plusDays(5));

    when(districtVolumeRepository.findByConfigTypeAndAreaAndEndDateIsNullOrderByStartDateDesc(
            ConfigType.SPECIES_COMPOSITION, Area.INTERIOR))
        .thenReturn(List.of(newestOpenEntry, olderOpenEntry));

    assertThatThrownBy(
          () -> speciesCompositionService.createSpeciesComposition(
              "TEST_USER",
              createDto))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining(
            "multiple open-ended species composition records exist for area INTERIOR");

    verify(districtVolumeRepository, never()).save(any(DistrictVolumeEntity.class));
  }

  @Test
  @DisplayName(
      "createSpeciesComposition — should save and return mapped DTO for valid COASTAL payload")
  void createSpeciesComposition_returnsMappedDto_whenCoastalIsValid() {

    CoastDataDto coastData =
        new CoastDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    LocalDate futureDate = LocalDate.now().plusDays(10);

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "COASTAL",
            futureDate,
            new BigDecimal("1.200"),
            new BigDecimal("1.500"),
            coastData);

    DistrictVolumeEntity savedEntity = buildEntity(Area.COASTAL);
    savedEntity.setStartDate(futureDate);
    savedEntity.setTableLevelFactor(new BigDecimal("1.200"));
    savedEntity.setHeliMultiplier(new BigDecimal("1.500"));

    when(districtVolumeRepository.findByConfigTypeAndAreaAndEndDateIsNullOrderByStartDateDesc(
            ConfigType.SPECIES_COMPOSITION, Area.COASTAL))
        .thenReturn(Collections.emptyList());
    when(districtVolumeRepository.save(
            any(DistrictVolumeEntity.class)))
        .thenReturn(savedEntity);

    DistrictVolumeDetailDto result =
        speciesCompositionService.createSpeciesComposition(
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

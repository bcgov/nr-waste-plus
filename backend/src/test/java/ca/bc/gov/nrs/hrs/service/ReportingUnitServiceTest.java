package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientStatusEnum;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;
import ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProvider;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
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
@DisplayName("Unit Test | Reporting Unit Service")
class ReportingUnitServiceTest {

  private static final Long RU_ID = 12345L;
  private static final String CLIENT_NUMBER = "00012797";

  @Mock
  private LegacyApiProvider legacyApiProvider;

  @Mock
  private ForestClientApiProvider forestClientApiProvider;

  @Mock
  private DistrictVolumeService districtVolumeService;

  @Mock
  private CodesService codesService;

  @Mock
  private ReportingUnitRepository reportingUnitRepository;

  @InjectMocks
  private ReportingUnitService reportingUnitService;

  @BeforeEach
  void setUp() {
    lenient()
        .when(districtVolumeService.getAreasForDistrictCode(anyString()))
        .thenReturn(List.of());
  }

  private ReportingUnitLegacyDetailsDto buildLegacyDetails(String clientNumber) {
    return new ReportingUnitLegacyDetailsDto(
        clientNumber,
        "00",
        new CodeDescriptionDto("S01", "Sample Method One"),
        new CodeDescriptionDto("DND", "Nadina Natural Resource District"));
  }

  private ForestClientDto buildClientDto(String clientNumber) {
    return ForestClientDto.builder()
        .clientNumber(clientNumber)
        .clientName("MINISTRY OF FORESTS")
        .clientStatusCode(ForestClientStatusEnum.ACTIVE)
        .build();
  }

  @Test
  @DisplayName("shouldReturnDetails_whenClientExistsInForestClientApi")
  void shouldReturnDetails_whenClientExistsInForestClientApi() {
    // Arrange
    var legacyDetails = buildLegacyDetails(CLIENT_NUMBER);
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyDetails);
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));

    // Act
    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    // Assert
    assertThat(result).isNotNull();
    assertThat(result.id()).isEqualTo(RU_ID);
    assertThat(result.client().code()).isEqualTo(CLIENT_NUMBER);
    assertThat(result.client().description()).isEqualTo("MINISTRY OF FORESTS");
    assertThat(result.clientStatus().code()).isEqualTo(ForestClientStatusEnum.ACTIVE.getCode());
    assertThat(result.clientStatus().description())
        .isEqualTo(ForestClientStatusEnum.ACTIVE.getDescription());
    assertThat(result.sampling()).isEqualTo(legacyDetails.sampling());
    assertThat(result.district()).isEqualTo(legacyDetails.district());
    assertThat(result.grade().code()).isNull();
    assertThat(result.grade().description()).isNull();
    assertThat(result.isLegacy()).isTrue();
  }

  @Test
  @DisplayName("shouldResolveSamplingViaCodesService_whenPostgresEntityHasSamplingCode")
  void shouldResolveSamplingViaCodesService_whenPostgresEntityHasSamplingCode() {
    var reportingUnit = postgresReportingUnit();
    reportingUnit.setSamplingCode("BLK");
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(codesService.getSamplingCodes())
        .thenReturn(List.of(new CodeDescriptionDto("BLK", "Cutblock")));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of("COASTAL"));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.sampling()).isEqualTo(new CodeDescriptionDto("BLK", "Cutblock"));
    assertThat(result.isLegacy()).isFalse();
  }

  @Test
  @DisplayName("shouldFallbackToDistrictAverage_whenCodesServiceThrowsRestClientException")
  void shouldFallbackToDistrictAverage_whenCodesServiceThrowsRestClientException() {
    var reportingUnit = postgresReportingUnit();
    reportingUnit.setSamplingCode("AVG");
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(codesService.getSamplingCodes())
        .thenThrow(new org.springframework.web.client.RestClientException("Codes service down"));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of("COASTAL"));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.sampling()).isEqualTo(new CodeDescriptionDto("AVG", "District Average"));
    assertThat(result.isLegacy()).isFalse();
  }

  @Test
  @DisplayName("shouldFallbackToDistrictAverage_whenSamplingCodesIsEmpty")
  void shouldFallbackToDistrictAverage_whenSamplingCodesIsEmpty() {
    var reportingUnit = postgresReportingUnit();
    reportingUnit.setSamplingCode("AVG");
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(codesService.getSamplingCodes()).thenReturn(List.of());
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of("COASTAL"));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.sampling()).isEqualTo(new CodeDescriptionDto("AVG", "District Average"));
    assertThat(result.isLegacy()).isFalse();
  }

  @Test
  @DisplayName("shouldFallbackToDefaultSampling_whenSamplingCodeAbsentFromNonEmptyCodesList")
  void shouldFallbackToDefaultSampling_whenSamplingCodeAbsentFromNonEmptyCodesList() {
    var reportingUnit = postgresReportingUnit();
    reportingUnit.setSamplingCode("CUSTOM");
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(codesService.getSamplingCodes())
        .thenReturn(List.of(new CodeDescriptionDto("BLK", "Cutblock")));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of("COASTAL"));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.sampling()).isEqualTo(new CodeDescriptionDto("CUSTOM", "CUSTOM"));
    assertThat(result.isLegacy()).isFalse();
  }

  @Test
  @DisplayName("shouldFallbackToDistrictAverage_whenAvgSamplingCodeAbsentFromNonEmptyCodesList")
  void shouldFallbackToDistrictAverage_whenAvgSamplingCodeAbsentFromNonEmptyCodesList() {
    var reportingUnit = postgresReportingUnit();
    reportingUnit.setSamplingCode("AVG");
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(codesService.getSamplingCodes())
        .thenReturn(List.of(new CodeDescriptionDto("BLK", "Cutblock")));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of("COASTAL"));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.sampling()).isEqualTo(new CodeDescriptionDto("AVG", "District Average"));
    assertThat(result.isLegacy()).isFalse();
  }

  @Test
  @DisplayName("shouldFallbackToDistrictAverage_whenSamplingCodeIsBlank")
  void shouldFallbackToDistrictAverage_whenSamplingCodeIsBlank() {
    var reportingUnit = postgresReportingUnit();
    reportingUnit.setSamplingCode("   ");
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of("COASTAL"));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.sampling()).isEqualTo(new CodeDescriptionDto("AVG", "District Average"));
    assertThat(result.isLegacy()).isFalse();
    verify(codesService, never()).getSamplingCodes();
  }

  @Test
  @DisplayName("shouldThrowForestClientNotFoundException_whenClientNotFoundInApi")
  void shouldThrowForestClientNotFoundException_whenClientNotFoundInApi() {
    // Arrange
    var legacyDetails = buildLegacyDetails("00099999");

    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyDetails);
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());
    when(forestClientApiProvider.fetchClientByNumber("00099999")).thenReturn(Optional.empty());

    // Act & Assert
    assertThatThrownBy(() -> reportingUnitService.getReportingUnitDetails(RU_ID))
        .isInstanceOf(ForestClientNotFoundException.class);
  }

  @Test
  @DisplayName("shouldDelegateLegacyCall_withCorrectReportingUnitId")
  void shouldDelegateLegacyCall_withCorrectReportingUnitId() {
    // Arrange
    Long anotherRuId = 99001L;
    var legacyDetails = buildLegacyDetails(CLIENT_NUMBER);
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(legacyApiProvider.getReportingUnitDetails(anotherRuId)).thenReturn(legacyDetails);
    when(reportingUnitRepository.findByIdAndDeletedFalse(anotherRuId))
        .thenReturn(Optional.empty());
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));

    // Act
    reportingUnitService.getReportingUnitDetails(anotherRuId);

    // Assert
    verify(legacyApiProvider).getReportingUnitDetails(anotherRuId);
    verify(forestClientApiProvider).fetchClientByNumber(CLIENT_NUMBER);
  }

  @Test
  @DisplayName("shouldPreserveSamplingAndDistrict_fromLegacyResponse")
  void shouldPreserveSamplingAndDistrict_fromLegacyResponse() {
    // Arrange
    var customSampling = new CodeDescriptionDto("S99", "Custom Sampling");
    var customDistrict = new CodeDescriptionDto("DCK", "Chilliwack Natural Resource District");

    var legacyDetails =
        new ReportingUnitLegacyDetailsDto(CLIENT_NUMBER, "01", customSampling, customDistrict);

    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyDetails);
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));

    // Act
    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    // Assert
    assertThat(result.sampling()).isEqualTo(customSampling);
    assertThat(result.district()).isEqualTo(customDistrict);
  }

  @Test
  @DisplayName("shouldBuildDetailsFromPostgres_whenReportingUnitExists")
  void shouldBuildDetailsFromPostgres_whenReportingUnitExists() {
    var reportingUnit = new ReportingUnitEntity();
    reportingUnit.setClientNumber(CLIENT_NUMBER);
    reportingUnit.setClientLocnCode("01");
    reportingUnit.setGeographicCode("DND");
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(
            List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of("COASTAL"));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.id()).isEqualTo(RU_ID);
    assertThat(result.client())
        .isEqualTo(new CodeDescriptionDto(CLIENT_NUMBER, "MINISTRY OF FORESTS"));
    assertThat(result.clientStatus())
        .isEqualTo(new CodeDescriptionDto("ACT", "Active"));
    assertThat(result.sampling()).isEqualTo(new CodeDescriptionDto("AVG", "District Average"));
    assertThat(result.district())
        .isEqualTo(new CodeDescriptionDto("DND", "Nadina Natural Resource District"));
    assertThat(result.grade()).isEqualTo(new CodeDescriptionDto("COASTAL", "COASTAL"));
    assertThat(result.isLegacy()).isFalse();
    verify(legacyApiProvider, never()).getReportingUnitDetails(RU_ID);
  }

  @Test
  @DisplayName("shouldFallbackToDefaultSampling_whenCodesServiceThrowsRestClientException")
  void shouldFallbackToDefaultSampling_whenCodesServiceThrowsRestClientException() {
    var reportingUnit = new ReportingUnitEntity();
    reportingUnit.setClientNumber(CLIENT_NUMBER);
    reportingUnit.setClientLocnCode("01");
    reportingUnit.setGeographicCode("DND");
    reportingUnit.setSamplingCode("CUSTOM");
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(
            List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of("COASTAL"));
    when(codesService.getSamplingCodes())
        .thenThrow(new org.springframework.web.client.RestClientException("API down"));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.sampling()).isEqualTo(new CodeDescriptionDto("CUSTOM", "CUSTOM"));
  }

  @Test
  @DisplayName("shouldLeaveGradeEmpty_whenPostgresDistrictHasNoConfiguredArea")
  void shouldLeaveGradeEmpty_whenPostgresDistrictHasNoConfiguredArea() {
    ReportingUnitEntity reportingUnit = postgresReportingUnit();
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(buildClientDto(CLIENT_NUMBER)));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of());

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.grade()).isEqualTo(new CodeDescriptionDto(null, null));
    assertThat(result.isLegacy()).isFalse();
    verify(legacyApiProvider, never()).getReportingUnitDetails(RU_ID);
  }

  @Test
  @DisplayName("shouldLeaveGradeEmpty_whenPostgresDistrictHasMultipleConfiguredAreas")
  void shouldLeaveGradeEmpty_whenPostgresDistrictHasMultipleConfiguredAreas() {
    ReportingUnitEntity reportingUnit = postgresReportingUnit();
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(buildClientDto(CLIENT_NUMBER)));
    when(districtVolumeService.getAreasForDistrictCode("DND"))
        .thenReturn(List.of("COASTAL", "INTERIOR"));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.grade()).isEqualTo(new CodeDescriptionDto(null, null));
    assertThat(result.sampling()).isEqualTo(new CodeDescriptionDto("AVG", "District Average"));
    assertThat(result.isLegacy()).isFalse();
  }

  @Test
  @DisplayName("shouldThrowIllegalState_whenPostgresOrgUnitHasNoDistrictCode")
  void shouldThrowIllegalState_whenPostgresOrgUnitHasNoDistrictCode() {
    ReportingUnitEntity reportingUnit = postgresReportingUnit();
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes()).thenReturn(List.of());

    assertThatThrownBy(() -> reportingUnitService.getReportingUnitDetails(RU_ID))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("DND");
    verify(forestClientApiProvider, never()).fetchClientByNumber(anyString());
    verify(legacyApiProvider, never()).getReportingUnitDetails(RU_ID);
  }

  @Test
  @DisplayName("shouldThrowForestClientNotFound_whenPostgresClientDoesNotResolve")
  void shouldThrowForestClientNotFound_whenPostgresClientDoesNotResolve() {
    ReportingUnitEntity reportingUnit = postgresReportingUnit();
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(codesService.getDistrictCodes())
        .thenReturn(List.of(new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> reportingUnitService.getReportingUnitDetails(RU_ID))
        .isInstanceOf(ForestClientNotFoundException.class);
    verify(legacyApiProvider, never()).getReportingUnitDetails(RU_ID);
    verify(districtVolumeService, never()).getAreasForDistrictCode("DND");
  }

  @Test
  @DisplayName("shouldUseSingleConfiguredGrade_whenLegacyDistrictHasOneConfiguredArea")
  void shouldUseSingleConfiguredGrade_whenLegacyDistrictHasOneConfiguredArea() {
    var legacyDetails = buildLegacyDetails(CLIENT_NUMBER);
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());
    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyDetails);
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(buildClientDto(CLIENT_NUMBER)));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of("INTERIOR"));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.grade()).isEqualTo(new CodeDescriptionDto("INTERIOR", "INTERIOR"));
    assertThat(result.isLegacy()).isTrue();
  }

  @Test
  @DisplayName("shouldUseLegacyDetails_whenPostgresReportingUnitIsSoftDeleted")
  void shouldUseLegacyDetails_whenPostgresReportingUnitIsSoftDeleted() {
    var legacyDetails = buildLegacyDetails(CLIENT_NUMBER);
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());
    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyDetails);
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(buildClientDto(CLIENT_NUMBER)));

    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    assertThat(result.isLegacy()).isTrue();
    assertThat(result.sampling()).isEqualTo(legacyDetails.sampling());
    assertThat(result.district()).isEqualTo(legacyDetails.district());
    verify(legacyApiProvider).getReportingUnitDetails(RU_ID);
  }

  @Test
  @DisplayName("shouldCreateReportingUnit_whenRequestIsValid")
  void shouldCreateReportingUnit_whenRequestIsValid() {
    // Arrange
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DND", "AVG", null);

    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));

    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(buildClientDto(CLIENT_NUMBER)));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of());

    when(legacyApiProvider.createReportingUnit(request)).thenReturn(333L);

    // Act
    var response = reportingUnitService.createReportingUnit(request);

    // Assert
    assertThat(response).isNotNull();
    assertThat(response).isEqualTo(333L);

    ArgumentCaptor<ReportingUnitEntity> captor = ArgumentCaptor.forClass(ReportingUnitEntity.class);
    verify(reportingUnitRepository).saveAndFlush(captor.capture());
    ReportingUnitEntity savedEntity = captor.getValue();
    assertThat(savedEntity.getId()).isEqualTo(333L);
    assertThat(savedEntity.getClientNumber()).isEqualTo(CLIENT_NUMBER);
    assertThat(savedEntity.getClientLocnCode()).isEqualTo("00");
    assertThat(savedEntity.getGeographicCode()).isEqualTo("DND");
    assertThat(savedEntity.getSamplingCode()).isEqualTo("AVG");
    assertThat(savedEntity.isDeleted()).isFalse();
  }

  @Test
  @DisplayName("shouldThrowAndLogError_whenPostgresPersistenceFails")
  void shouldThrowAndLogError_whenPostgresPersistenceFails() {
    // Arrange
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DND", "AVG", null);

    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));

    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(buildClientDto(CLIENT_NUMBER)));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of());

    when(legacyApiProvider.createReportingUnit(request)).thenReturn(333L);
    when(reportingUnitRepository.saveAndFlush(any(ReportingUnitEntity.class)))
        .thenThrow(new RuntimeException("Database error"));

    // Act & Assert
    assertThatThrownBy(() -> reportingUnitService.createReportingUnit(request))
        .isInstanceOf(RuntimeException.class)
        .hasMessage("Database error");
  }

  @Test
  @DisplayName("shouldThrowBadRequest_whenGradeMissingForDKM")
  void shouldThrowBadRequest_whenGradeMissingForDkm() {
    // Arrange
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DKM", "AVG", null);

    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));

    when(districtVolumeService.getAreasForDistrictCode("DKM"))
        .thenReturn(List.of("COASTAL", "INTERIOR"));

    // Act & Assert
    assertThatThrownBy(() -> reportingUnitService.createReportingUnit(request))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST));
  }

  @Test
  @DisplayName("shouldCreateReportingUnit_whenDistrictHasSingleConfiguredArea")
  void shouldCreateReportingUnit_whenDistrictHasSingleConfiguredArea() {
    // Arrange
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DND", "AVG", null);

    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));

    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(buildClientDto(CLIENT_NUMBER)));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of("COASTAL"));

    when(legacyApiProvider.createReportingUnit(request)).thenReturn(333L);

    // Act
    var response = reportingUnitService.createReportingUnit(request);

    // Assert
    assertThat(response).isEqualTo(333L);
    verify(reportingUnitRepository).saveAndFlush(any(ReportingUnitEntity.class));
  }

  @Test
  @DisplayName("shouldThrowConflict_whenReportingUnitAlreadyExists")
  void shouldThrowConflict_whenReportingUnitAlreadyExists() {
    // Arrange
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DND", "AVG", null);

    var existingResult =
        new ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto(
            "1",
            26L,
            "",
            36834L,
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto(CLIENT_NUMBER, null),
            null,
            null,
            null,
            false,
            false,
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("S01", "Sample"),
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("DND", "Nadina"),
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("DFT", "Draft"),
            LocalDateTime.now(),
            false);

    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(existingResult), PageRequest.of(0, 1), 1));
    when(reportingUnitRepository.existsById(1L)).thenReturn(false);

    // Act & Assert: existing S01 unit must NOT be adopted as AVG even if missing in PostgreSQL
    assertThatThrownBy(() -> reportingUnitService.createReportingUnit(request))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(org.springframework.http.HttpStatus.CONFLICT));
    verify(reportingUnitRepository, never()).saveAndFlush(any());
    verify(legacyApiProvider, never()).createReportingUnit(any());
  }

  @Test
  @DisplayName("shouldThrowConflict_whenMatchingReportingUnitAlreadyExistsLocally")
  void shouldThrowConflict_whenMatchingReportingUnitAlreadyExistsLocally() {
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DND", "AVG", null);

    var existingResult =
        new ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto(
            "1",
            26L,
            "",
            36834L,
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto(CLIENT_NUMBER, null),
            null,
            null,
            null,
            false,
            false,
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("AVG", "District Average"),
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("DND", "Nadina"),
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("DFT", "Draft"),
            LocalDateTime.now(),
            false);

    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(existingResult), PageRequest.of(0, 1), 1));
    when(reportingUnitRepository.existsById(1L)).thenReturn(true);

    // Act & Assert
    assertThatThrownBy(() -> reportingUnitService.createReportingUnit(request))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(org.springframework.http.HttpStatus.CONFLICT));
    verify(reportingUnitRepository, never()).saveAndFlush(any());
    verify(legacyApiProvider, never()).createReportingUnit(any());
  }

  @Test
  @DisplayName("shouldReconcileUncommittedLegacyReportingUnit_whenMissingLocally")
  void shouldReconcileUncommittedLegacyReportingUnit_whenMissingLocally() {
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DND", "AVG", null);

    var existingResult =
        new ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto(
            "1",
            26L,
            "",
            36834L,
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto(CLIENT_NUMBER, null),
            null,
            null,
            null,
            false,
            false,
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("AVG", "District Average"),
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("DND", "Nadina"),
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("DFT", "Draft"),
            LocalDateTime.now(),
            false);

    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(existingResult), PageRequest.of(0, 1), 1));
    when(reportingUnitRepository.existsById(1L)).thenReturn(false);
    when(reportingUnitRepository.findById(1L)).thenReturn(Optional.empty());

    // Act
    Long resultId = reportingUnitService.createReportingUnit(request);

    // Assert: reconciles locally without calling remote create again
    assertThat(resultId).isEqualTo(1L);
    verify(reportingUnitRepository).saveAndFlush(any());
    verify(legacyApiProvider, never()).createReportingUnit(any());
  }

  @Test
  @DisplayName("shouldCreateReportingUnit_whenLegacySearchReturnsNull")
  void shouldCreateReportingUnit_whenLegacySearchReturnsNull() {
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DND", "AVG", null);
    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(null);
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of());
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(buildClientDto(CLIENT_NUMBER)));
    when(legacyApiProvider.createReportingUnit(request)).thenReturn(444L);

    assertThat(reportingUnitService.createReportingUnit(request)).isEqualTo(444L);
    verify(legacyApiProvider).createReportingUnit(request);
  }

  @Test
  @DisplayName("shouldThrowBadRequest_whenGradeIsBlankForMultiAreaDistrict")
  void shouldThrowBadRequest_whenGradeIsBlankForMultiAreaDistrict() {
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DKM", "AVG", "  ");
    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));
    when(districtVolumeService.getAreasForDistrictCode("DKM"))
        .thenReturn(List.of("COASTAL", "INTERIOR"));

    assertThatThrownBy(() -> reportingUnitService.createReportingUnit(request))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(
            exception -> {
              var statusException = (ResponseStatusException) exception;
              assertThat(statusException.getStatusCode())
                  .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);
              assertThat(statusException.getReason()).contains("Grade code is required");
            });
    verify(forestClientApiProvider, never()).fetchClientByNumber(CLIENT_NUMBER);
  }

  @Test
  @DisplayName("shouldCreateReportingUnit_whenGradeIsProvidedForMultiAreaDistrict")
  void shouldCreateReportingUnit_whenGradeIsProvidedForMultiAreaDistrict() {
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DKM", "AVG", "COASTAL");
    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));
    when(districtVolumeService.getAreasForDistrictCode("DKM"))
        .thenReturn(List.of("COASTAL", "INTERIOR"));
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(buildClientDto(CLIENT_NUMBER)));
    when(legacyApiProvider.createReportingUnit(request)).thenReturn(445L);

    assertThat(reportingUnitService.createReportingUnit(request)).isEqualTo(445L);
    verify(legacyApiProvider).createReportingUnit(request);
  }

  @Test
  @DisplayName("shouldThrowForestClientNotFound_whenCreatingForUnknownClient")
  void shouldThrowForestClientNotFound_whenCreatingForUnknownClient() {
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DND", "AVG", null);
    when(legacyApiProvider.searchReportingUnit(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));
    when(districtVolumeService.getAreasForDistrictCode("DND")).thenReturn(List.of());
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> reportingUnitService.createReportingUnit(request))
        .isInstanceOf(ForestClientNotFoundException.class);
    verify(legacyApiProvider, never()).createReportingUnit(request);
  }

  @Test
  @DisplayName("shouldThrowBadRequest_whenSamplingCodeIsNotAvg")
  void shouldThrowBadRequest_whenSamplingCodeIsNotAvg() {
    // Arrange
    var request =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
            CLIENT_NUMBER, "DND", "NOT_AVG", null);

    // Act & Assert
    assertThatThrownBy(() -> reportingUnitService.createReportingUnit(request))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(
            e -> {
              ResponseStatusException rse = (ResponseStatusException) e;
              assertThat(rse.getStatusCode())
                  .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);
              assertThat(rse.getReason()).contains("Invalid samplingCode");
            });
  }

  private ReportingUnitEntity postgresReportingUnit() {
    ReportingUnitEntity reportingUnit = new ReportingUnitEntity();
    reportingUnit.setClientNumber(CLIENT_NUMBER);
    reportingUnit.setClientLocnCode("01");
    reportingUnit.setGeographicCode("DND");
    return reportingUnit;
  }
}

package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientStatusEnum;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;
import ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProvider;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import java.util.Optional;
import java.util.List;
import java.time.LocalDateTime;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Reporting Unit Service")
class ReportingUnitServiceTest {

  @Mock
  private LegacyApiProvider legacyApiProvider;

  @Mock
  private ForestClientApiProvider forestClientApiProvider;

  @InjectMocks
  private ReportingUnitService reportingUnitService;

  private static final Long RU_ID = 12345L;
  private static final String CLIENT_NUMBER = "00012797";

  private ReportingUnitLegacyDetailsDto buildLegacyDetails(String clientNumber) {
    return new ReportingUnitLegacyDetailsDto(
        clientNumber,
        "00",
        new CodeDescriptionDto("S01", "Sample Method One"),
        new CodeDescriptionDto("DND", "Nadina Natural Resource District")
    );
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
    // TODO(grade-configuration): Assert result.grade() here once the grade-configuration
    // feature branch populates the field from a real data source and reinstates it in
    // ReportingUnitDetailsDto.
  }

  @Test
  @DisplayName("shouldThrowForestClientNotFoundException_whenClientNotFoundInApi")
  void shouldThrowForestClientNotFoundException_whenClientNotFoundInApi() {
    // Arrange
    var legacyDetails = buildLegacyDetails("00099999");

    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyDetails);
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
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));

    // Act
    reportingUnitService.getReportingUnitDetails(anotherRuId);

    // Assert — legacy provider must be called with the exact ID
    verify(legacyApiProvider).getReportingUnitDetails(anotherRuId);
    verify(forestClientApiProvider).fetchClientByNumber(CLIENT_NUMBER);
  }

  @Test
  @DisplayName("shouldPreserveSamplingAndDistrict_fromLegacyResponse")
  void shouldPreserveSamplingAndDistrict_fromLegacyResponse() {
    // Arrange
    var customSampling = new CodeDescriptionDto("S99", "Custom Sampling");
    var customDistrict = new CodeDescriptionDto("DCK", "Chilliwack Natural Resource District");
    var legacyDetails = new ReportingUnitLegacyDetailsDto(
        CLIENT_NUMBER, "01", customSampling, customDistrict);
    var clientDto = buildClientDto(CLIENT_NUMBER);

    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyDetails);
    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(clientDto));

    // Act
    var result = reportingUnitService.getReportingUnitDetails(RU_ID);

    // Assert — sampling and district must come from legacy response unchanged
    assertThat(result.sampling()).isEqualTo(customSampling);
    assertThat(result.district()).isEqualTo(customDistrict);
  }

  @Test
  @DisplayName("shouldCreateReportingUnit_whenRequestIsValid")
  void shouldCreateReportingUnit_whenRequestIsValid() {
    // Arrange
    var request = new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
        CLIENT_NUMBER, "DND", "S01", null);

    when(legacyApiProvider.searchReportingUnit(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));

    when(forestClientApiProvider.fetchClientByNumber(CLIENT_NUMBER))
        .thenReturn(Optional.of(buildClientDto(CLIENT_NUMBER)));

    when(legacyApiProvider.createReportingUnit(request)).thenReturn(333L);

    // Act
    var response = reportingUnitService.createReportingUnit(request);

    // Assert
    assertThat(response).isNotNull();
    assertThat(response).isEqualTo(333L);
  }

  @Test
  @DisplayName("shouldThrowBadRequest_whenGradeMissingForDKM")
  void shouldThrowBadRequest_whenGradeMissingForDKM() {
    // Arrange — ensure no duplicate exists
    var request = new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
        CLIENT_NUMBER, "DKM", "S01", null);

    when(legacyApiProvider.searchReportingUnit(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));

    // Act & Assert — grade validation happens before forest client lookup
    assertThatThrownBy(() -> reportingUnitService.createReportingUnit(request))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST));
  }

  @Test
  @DisplayName("shouldThrowConflict_whenReportingUnitAlreadyExists")
  void shouldThrowConflict_whenReportingUnitAlreadyExists() {
    // Arrange
    var request = new ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto(
        CLIENT_NUMBER, "DND", "S01", null);

    var existingResult = new ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto(
        "1", 26L, "", 36834L,
        new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto(CLIENT_NUMBER, null),
        null, null, null, false, false,
        new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("S01", "Sample"),
        new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("DND", "Nadina"),
        new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("DFT", "Draft"),
        LocalDateTime.now(), false);

    when(legacyApiProvider.searchReportingUnit(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(new PageImpl<>(List.of(existingResult), PageRequest.of(0, 1), 1));

    // Act & Assert
    assertThatThrownBy(() -> reportingUnitService.createReportingUnit(request))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.CONFLICT));
  }
}


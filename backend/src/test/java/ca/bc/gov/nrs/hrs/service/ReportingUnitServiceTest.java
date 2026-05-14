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
    // Grade is currently a placeholder — code and description may be null until the
    // grade configuration task is implemented
    assertThat(result.grade()).isNotNull();
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
}


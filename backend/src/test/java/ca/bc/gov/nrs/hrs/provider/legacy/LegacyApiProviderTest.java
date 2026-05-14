package ca.bc.gov.nrs.hrs.provider.legacy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Legacy API Provider")
class LegacyApiProviderTest {

  @Mock
  private LegacyCodesClient codesClient;

  @Mock
  private LegacyReportingUnitClient reportingUnitClient;

  @Mock
  private LegacyMyForestClientClient myForestClientClient;

  @InjectMocks
  private LegacyApiProvider legacyApiProvider;

  @Test
  @DisplayName("shouldDelegateGetReportingUnitDetails_toReportingUnitClient")
  void shouldDelegateGetReportingUnitDetails_toReportingUnitClient() {
    // Arrange
    Long reportingUnitId = 12345L;
    var expected = new ReportingUnitLegacyDetailsDto(
        "00012797", "00",
        new CodeDescriptionDto("S01", "Sample Method One"),
        new CodeDescriptionDto("DND", "Nadina Natural Resource District")
    );

    when(reportingUnitClient.getReportingUnitDetails(reportingUnitId)).thenReturn(expected);

    // Act
    var result = legacyApiProvider.getReportingUnitDetails(reportingUnitId);

    // Assert
    assertThat(result).isEqualTo(expected);
    verify(reportingUnitClient).getReportingUnitDetails(reportingUnitId);
  }

  @Test
  @DisplayName("shouldDelegateGetDistrictCodes_toCodesClient")
  void shouldDelegateGetDistrictCodes_toCodesClient() {
    // Arrange
    var codes = List.of(new CodeDescriptionDto("DND", "Nadina"));
    when(codesClient.getDistrictCodes()).thenReturn(codes);

    // Act
    var result = legacyApiProvider.getDistrictCodes();

    // Assert
    assertThat(result).isEqualTo(codes);
    verify(codesClient).getDistrictCodes();
  }

  @Test
  @DisplayName("shouldDelegateGetSamplingCodes_toCodesClient")
  void shouldDelegateGetSamplingCodes_toCodesClient() {
    // Arrange
    var codes = List.of(new CodeDescriptionDto("S01", "Method 1"));
    when(codesClient.getSamplingCodes()).thenReturn(codes);

    // Act
    var result = legacyApiProvider.getSamplingCodes();

    // Assert
    assertThat(result).isEqualTo(codes);
    verify(codesClient).getSamplingCodes();
  }

  @Test
  @DisplayName("shouldDelegateGetStatusCodes_toCodesClient")
  void shouldDelegateGetStatusCodes_toCodesClient() {
    // Arrange
    var codes = List.of(new CodeDescriptionDto("ACT", "Active"));
    when(codesClient.getStatusCodes()).thenReturn(codes);

    // Act
    var result = legacyApiProvider.getStatusCodes();

    // Assert
    assertThat(result).isEqualTo(codes);
    verify(codesClient).getStatusCodes();
  }

  @Test
  @DisplayName("shouldDelegateSearchReportingUnit_toReportingUnitClient")
  void shouldDelegateSearchReportingUnit_toReportingUnitClient() {
    // Arrange
    var filters = ReportingUnitSearchParametersDto.builder().build();
    var pageable = PageRequest.of(0, 10);
    Page<ReportingUnitSearchResultDto> page = new PageImpl<>(List.of(), pageable, 0);

    when(reportingUnitClient.searchReportingUnit(filters, pageable)).thenReturn(page);

    // Act
    var result = legacyApiProvider.searchReportingUnit(filters, pageable);

    // Assert
    assertThat(result).isEqualTo(page);
    verify(reportingUnitClient).searchReportingUnit(filters, pageable);
  }

  @Test
  @DisplayName("shouldDelegateSearchReportingUnitUsers_toReportingUnitClient")
  void shouldDelegateSearchReportingUnitUsers_toReportingUnitClient() {
    // Arrange
    var users = List.of("jake", "finn");
    when(reportingUnitClient.searchReportingUnitUsers("ja")).thenReturn(users);

    // Act
    var result = legacyApiProvider.searchReportingUnitUsers("ja");

    // Assert
    assertThat(result).isEqualTo(users);
    verify(reportingUnitClient).searchReportingUnitUsers("ja");
  }
}


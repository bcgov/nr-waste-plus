package ca.bc.gov.nrs.hrs.service.reportingunit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity;
import ca.bc.gov.nrs.hrs.entity.codes.SamplingOptionEntity;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitDetailsProjection;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.WasteReportingUnitNotFound;
import ca.bc.gov.nrs.hrs.mappers.reportingunit.ReportingUnitDetailsMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.codes.OrgUnitRepository;
import ca.bc.gov.nrs.hrs.repository.codes.SamplingOptionRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@DisplayName("Unit Test | ReportingUnitService")
@ExtendWith(MockitoExtension.class)
class ReportingUnitServiceTest {

  @Mock
  private ReportingUnitRepository ruRepository;

  @Mock
  private ReportingUnitDetailsMapper ruDetailsMapper;

  @Mock
  private OrgUnitRepository orgUnitRepository;

  @Mock
  private SamplingOptionRepository samplingOptionRepository;

  @InjectMocks
  private ReportingUnitService service;

  private static final Long RU_ID = 879L;
  private static final List<String> CLIENTS = List.of("00001271", "00001272");

  @Captor
  private ArgumentCaptor<ReportingUnitEntity> ruEntityCaptor;

  private ReportingUnitDetailsDto buildDetailsDto() {
    return new ReportingUnitDetailsDto(
        "00001271",
        "00",
        new CodeDescriptionDto("AGR", "Aggregate"),
        new CodeDescriptionDto("DSS", "Skeena Stikine")
    );
  }

  @Nested
  @DisplayName("getReportingUnitDetails")
  class GetReportingUnitDetails {

    @Test
    @DisplayName("should return DTO when reporting unit is found for given clients")
    void shouldReturnDto_whenReportingUnitFound() {
      // Arrange
      ReportingUnitDetailsProjection projection = mock(ReportingUnitDetailsProjection.class);
      ReportingUnitDetailsDto expectedDto = buildDetailsDto();
      when(ruRepository.getReportingUnitDetails(RU_ID, CLIENTS))
          .thenReturn(Optional.of(projection));
      when(ruDetailsMapper.fromProjection(projection)).thenReturn(expectedDto);

      // Act
      ReportingUnitDetailsDto result = service.getReportingUnitDetails(RU_ID, CLIENTS);

      // Assert
      assertThat(result).isNotNull();
      assertThat(result.clientNumber()).isEqualTo("00001271");
      assertThat(result.clientLocnCode()).isEqualTo("00");
      assertThat(result.sampling().code()).isEqualTo("AGR");
      assertThat(result.district().code()).isEqualTo("DSS");
    }

    @Test
    @DisplayName("should throw WasteReportingUnitNotFound when reporting unit does not exist")
    void shouldThrowException_whenReportingUnitNotFound() {
      // Arrange
      when(ruRepository.getReportingUnitDetails(RU_ID, CLIENTS))
          .thenReturn(Optional.empty());

      // Act & Assert
      assertThatThrownBy(() -> service.getReportingUnitDetails(RU_ID, CLIENTS))
          .isInstanceOf(WasteReportingUnitNotFound.class);
      verify(ruDetailsMapper, never()).fromProjection(any());
    }

    @Test
    @DisplayName("should use NOVALUE sentinel when clients list is empty")
    void shouldUseNoValueSentinel_whenClientsEmpty() {
      // Arrange
      List<String> noValueList = List.of(LegacyConstants.NOVALUE);
      when(ruRepository.getReportingUnitDetails(RU_ID, noValueList))
          .thenReturn(Optional.empty());

      // Act & Assert
      assertThatThrownBy(() -> service.getReportingUnitDetails(RU_ID, List.of()))
          .isInstanceOf(WasteReportingUnitNotFound.class);
      verify(ruRepository).getReportingUnitDetails(RU_ID, noValueList);
    }

    @Test
    @DisplayName("should use NOVALUE sentinel when clients list is null")
    void shouldUseNoValueSentinel_whenClientsNull() {
      // Arrange
      List<String> noValueList = List.of(LegacyConstants.NOVALUE);
      when(ruRepository.getReportingUnitDetails(RU_ID, noValueList))
          .thenReturn(Optional.empty());

      // Act & Assert
      assertThatThrownBy(() -> service.getReportingUnitDetails(RU_ID, null))
          .isInstanceOf(WasteReportingUnitNotFound.class);
      verify(ruRepository).getReportingUnitDetails(RU_ID, noValueList);
    }

    @Test
    @DisplayName("should not replace provided clients when list is non-empty")
    void shouldNotReplaceClients_whenListNonEmpty() {
      // Arrange
      ReportingUnitDetailsProjection projection = mock(ReportingUnitDetailsProjection.class);
      when(ruRepository.getReportingUnitDetails(eq(RU_ID), eq(CLIENTS)))
          .thenReturn(Optional.of(projection));
      when(ruDetailsMapper.fromProjection(projection)).thenReturn(buildDetailsDto());

      // Act
      service.getReportingUnitDetails(RU_ID, CLIENTS);

      // Assert
      verify(ruRepository).getReportingUnitDetails(RU_ID, CLIENTS);
    }
  }

  // Helper for never-called verify when mapper should not be invoked
  private <T> T any() {
    return ArgumentMatchers.any();
  }

  @Nested
  @DisplayName("createReportingUnit")
  class CreateReportingUnit {

    @Test
    @DisplayName("should create reporting unit when district code resolves to an org unit")
    void shouldCreateReportingUnit_whenOrgUnitFound() {
      // Arrange
      String district = "DKM";
      OrgUnitEntity orgUnit = OrgUnitEntity.builder()
          .orgUnitNo(123L)
          .orgUnitCode(district)
          .build();
      when(orgUnitRepository.findByOrgUnitCode(district))
          .thenReturn(java.util.Optional.of(orgUnit));

      SamplingOptionEntity samplingOption = SamplingOptionEntity.builder()
          .id("AGR")
          .build();
      when(samplingOptionRepository.findAllValid())
          .thenReturn(List.of(samplingOption));

      CreateReportingUnitRequestDto request = new CreateReportingUnitRequestDto(
          "00001271",
          district,
          "AGR",
          null
      );

      ReportingUnitEntity saved = ReportingUnitEntity.builder()
          .id(555L)
          .orgUnitNo(123L)
          .clientNumber(request.clientNumber())
          .clientLocationCode("00")
          .wasteSamplingOptionCode(request.samplingCode())
          .createdBy("IDIR\\user")
          .updatedBy("IDIR\\user")
          .revision(1L)
          .build();

      when(ruRepository.save(ArgumentMatchers.any(ReportingUnitEntity.class)))
          .thenReturn(saved);

      // Act
      Long result = service.createReportingUnit(request, "IDIR\\user");

      // Assert
      assertThat(result).isEqualTo(555L);
      verify(ruRepository).save(ruEntityCaptor.capture());
      ReportingUnitEntity captured = ruEntityCaptor.getValue();
      assertThat(captured.getOrgUnitNo()).isEqualTo(123L);
      assertThat(captured.getClientNumber()).isEqualTo("00001271");
      assertThat(captured.getClientLocationCode()).isEqualTo("00");
      assertThat(captured.getWasteSamplingOptionCode()).isEqualTo("AGR");
      assertThat(captured.getCreatedBy()).isEqualTo("IDIR\\user");
      assertThat(captured.getUpdatedBy()).isEqualTo("IDIR\\user");
      assertThat(captured.getRevision()).isEqualTo(1L);
      assertThat(captured.getCreatedAt()).isNotNull();
      assertThat(captured.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("should throw IllegalArgumentException when district code does not resolve")
    void shouldThrow_whenDistrictNotFound() {
      // Arrange
      String district = "UNKNOWN";
      when(orgUnitRepository.findByOrgUnitCode(district)).thenReturn(java.util.Optional.empty());

      CreateReportingUnitRequestDto request = new CreateReportingUnitRequestDto(
          "00001271",
          district,
          "AGR",
          null
      );

      // Act & Assert
      assertThatThrownBy(() -> service.createReportingUnit(request, "user"))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining(district);
      verify(ruRepository, never()).save(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("should throw ResponseStatusException when sampling code is invalid")
    void shouldThrow_whenSamplingCodeNotFound() {
      // Arrange
      String district = "DKM";
      OrgUnitEntity orgUnit = OrgUnitEntity.builder()
          .orgUnitNo(123L)
          .orgUnitCode(district)
          .build();
      when(orgUnitRepository.findByOrgUnitCode(district))
          .thenReturn(java.util.Optional.of(orgUnit));

      String invalidSamplingCode = "BAD";
      when(samplingOptionRepository.findAllValid())
          .thenReturn(List.of());

      CreateReportingUnitRequestDto request = new CreateReportingUnitRequestDto(
          "00001271",
          district,
          invalidSamplingCode,
          null
      );

      // Act & Assert
      assertThatThrownBy(() -> service.createReportingUnit(request, "user"))
          .isInstanceOf(ResponseStatusException.class)
          .satisfies(ex -> {
            ResponseStatusException statusEx = (ResponseStatusException) ex;
            assertThat(statusEx.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(statusEx.getReason()).isEqualTo("Invalid samplingCode: " + invalidSamplingCode);
          });
      verify(ruRepository, never()).save(ArgumentMatchers.any());
    }

  }
}
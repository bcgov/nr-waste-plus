package ca.bc.gov.nrs.hrs.service.reportingunit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchExpandedProjection;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchProjection;
import ca.bc.gov.nrs.hrs.mappers.search.ReportingUnitSearchExpandedMapper;
import ca.bc.gov.nrs.hrs.mappers.search.ReportingUnitSearchMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@DisplayName("Unit Test | ReportingUnitSearchService")
@ExtendWith(MockitoExtension.class)
class ReportingUnitSearchServiceTest {

  @Mock
  private ReportingUnitRepository ruRepository;

  @Mock
  private ReportingUnitSearchMapper ruSearchMapper;

  @Mock
  private ReportingUnitSearchExpandedMapper expandedMapper;

  @InjectMocks
  private ReportingUnitSearchService service;

  private static final List<String> CLIENT_NUMBERS = List.of("00001271");

  // -----------------------------------------------------------------------
  // search
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("search")
  class Search {

    @Test
    @DisplayName("should call repository and return mapped page")
    void shouldCallRepository_andReturnMappedPage() {
      // Arrange
      ReportingUnitSearchParametersDto filters = new ReportingUnitSearchParametersDto();
      PageRequest pageable = PageRequest.of(0, 10, Sort.unsorted());
      ReportingUnitSearchProjection projection = mock(ReportingUnitSearchProjection.class);
      ReportingUnitSearchResultDto dto = mock(ReportingUnitSearchResultDto.class);
      Page<ReportingUnitSearchProjection> projPage = new PageImpl<>(List.of(projection));

      when(ruRepository.searchReportingUnits(any(), any())).thenReturn(projPage);
      when(ruSearchMapper.fromProjection(projection)).thenReturn(dto);

      // Act
      Page<ReportingUnitSearchResultDto> result =
          service.search(filters, pageable, CLIENT_NUMBERS, "user1");

      // Assert
      assertThat(result).isNotNull();
      assertThat(result.getContent()).hasSize(1);
      verify(ruRepository).searchReportingUnits(any(), any());
    }

    @Test
    @DisplayName("should replace filter client numbers with user client numbers when filter has NOVALUE")
    void shouldReplaceClientNumbers_whenFilterHasNoValue() {
      // Arrange
      ReportingUnitSearchParametersDto filters = new ReportingUnitSearchParametersDto();
      filters.setClientNumbers(List.of(LegacyConstants.NOVALUE));
      PageRequest pageable = PageRequest.of(0, 10, Sort.unsorted());
      Page<ReportingUnitSearchProjection> emptyPage = Page.empty();

      when(ruRepository.searchReportingUnits(any(), any())).thenReturn(emptyPage);

      // Act
      service.search(filters, pageable, CLIENT_NUMBERS, "user1");

      // Assert — verify filters were mutated to use userClientNumbers
      assertThat(filters.getClientNumbers()).isEqualTo(CLIENT_NUMBERS);
    }

    @Test
    @DisplayName("should replace filter client numbers when filter client numbers list is empty")
    void shouldReplaceClientNumbers_whenFilterClientNumbersEmpty() {
      // Arrange
      ReportingUnitSearchParametersDto filters = new ReportingUnitSearchParametersDto();
      filters.setClientNumbers(List.of());
      PageRequest pageable = PageRequest.of(0, 10, Sort.unsorted());
      Page<ReportingUnitSearchProjection> emptyPage = Page.empty();

      when(ruRepository.searchReportingUnits(any(), any())).thenReturn(emptyPage);

      // Act
      service.search(filters, pageable, CLIENT_NUMBERS, "user1");

      // Assert — after the NOVALUE fallback in getClientNumbers, the list gets replaced
      assertThat(filters.getClientNumbers()).isEqualTo(CLIENT_NUMBERS);
    }

    @Test
    @DisplayName("should keep filter client numbers when they are explicitly set")
    void shouldKeepFilterClientNumbers_whenExplicitlySet() {
      // Arrange
      List<String> explicitClients = List.of("00099999");
      ReportingUnitSearchParametersDto filters = new ReportingUnitSearchParametersDto();
      filters.setClientNumbers(explicitClients);
      PageRequest pageable = PageRequest.of(0, 10, Sort.unsorted());
      Page<ReportingUnitSearchProjection> emptyPage = Page.empty();

      when(ruRepository.searchReportingUnits(any(), any())).thenReturn(emptyPage);

      // Act
      service.search(filters, pageable, CLIENT_NUMBERS, "user1");

      // Assert — explicit clients remain unchanged
      assertThat(filters.getClientNumbers()).isEqualTo(explicitClients);
    }

    @Test
    @DisplayName("should set requestUserId on filters when requestByMe is true")
    void shouldSetRequestUserId_whenRequestByMeIsTrue() {
      // Arrange
      ReportingUnitSearchParametersDto filters = new ReportingUnitSearchParametersDto();
      filters.setRequestByMe(true);
      filters.setClientNumbers(List.of("00001271"));
      PageRequest pageable = PageRequest.of(0, 10, Sort.unsorted());
      Page<ReportingUnitSearchProjection> emptyPage = Page.empty();

      when(ruRepository.searchReportingUnits(any(), any())).thenReturn(emptyPage);

      // Act
      service.search(filters, pageable, CLIENT_NUMBERS, "IDIR\\TESTUSER");

      // Assert
      assertThat(filters.getRequestUserId()).isEqualTo("IDIR\\TESTUSER");
    }

    @Test
    @DisplayName("should not set requestUserId on filters when requestByMe is false")
    void shouldNotSetRequestUserId_whenRequestByMeIsFalse() {
      // Arrange
      ReportingUnitSearchParametersDto filters = new ReportingUnitSearchParametersDto();
      filters.setRequestByMe(false);
      filters.setClientNumbers(List.of("00001271"));
      PageRequest pageable = PageRequest.of(0, 10, Sort.unsorted());
      Page<ReportingUnitSearchProjection> emptyPage = Page.empty();

      when(ruRepository.searchReportingUnits(any(), any())).thenReturn(emptyPage);

      // Act
      service.search(filters, pageable, CLIENT_NUMBERS, "IDIR\\TESTUSER");

      // Assert
      assertThat(filters.getRequestUserId()).isNullOrEmpty();
    }
  }

  // -----------------------------------------------------------------------
  // getReportingUnitBlockExpanded
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("getReportingUnitBlockExpanded")
  class GetReportingUnitBlockExpanded {

    @Test
    @DisplayName("should return empty optional when repository returns nothing")
    void shouldReturnEmpty_whenRepositoryReturnsEmpty() {
      // Arrange
      when(ruRepository.getSearchExpandedContent(879L, 1906L)).thenReturn(Optional.empty());

      // Act
      Optional<ReportingUnitSearchExpandedDto> result =
          service.getReportingUnitBlockExpanded(879L, 1906L);

      // Assert
      assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("should return mapped DTO when repository returns a projection")
    void shouldReturnMappedDto_whenProjectionFound() {
      // Arrange
      ReportingUnitSearchExpandedProjection projection =
          mock(ReportingUnitSearchExpandedProjection.class);
      ReportingUnitSearchExpandedDto dto = mock(ReportingUnitSearchExpandedDto.class);
      when(ruRepository.getSearchExpandedContent(34004L, 161966L))
          .thenReturn(Optional.of(projection));
      when(expandedMapper.fromProjection(projection)).thenReturn(dto);

      // Act
      Optional<ReportingUnitSearchExpandedDto> result =
          service.getReportingUnitBlockExpanded(34004L, 161966L);

      // Assert
      assertThat(result).isPresent().contains(dto);
      verify(expandedMapper).fromProjection(projection);
    }
  }
}


package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.provider.search.PostgresReportingUnitSearchProvider;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Search Service")
class SearchServiceTest {

  @Mock
  private LegacyApiProvider legacyApiProvider;

  @Mock
  private PostgresReportingUnitSearchProvider postgresSearchProvider;

  @Mock
  private ForestClientService forestClientService;

  @Mock
  private UserService userService;

  @Mock
  private FeatureFlagsConfiguration featureFlagsConfiguration;

  @InjectMocks
  private SearchService searchService;

  private static final String USER_ID = "IDIR\\testuser";
  private static final Pageable PAGEABLE = PageRequest.of(0, 10);

  private ReportingUnitSearchResultDto createResult(Long ruNumber, String clientCode) {
    return new ReportingUnitSearchResultDto(
        null,
        26L,
        null,
        ruNumber,
        new CodeDescriptionDto(clientCode, null),
        "LIC-123",
        "CP-01",
        "TM-456",
        false,
        false,
        new CodeDescriptionDto("BLK", "Cutblock"),
        new CodeDescriptionDto("DND", "Nadina Natural Resource District"),
        new CodeDescriptionDto("DFT", "Draft"),
        LocalDateTime.of(2025, 8, 24, 9, 10, 28),
        false);
  }

  @BeforeEach
  void setUp() {
    // Lenient: tests that fail at the provider never reach the enrichment that consumes this stub.
    lenient()
        .when(featureFlagsConfiguration.isEnabled(FeatureFlag.BOOKMARK_REPORTING_UNIT_ENABLED))
        .thenReturn(true);
  }

  @Test
  @DisplayName("Search should enrich results with bookmarked=true when RU is bookmarked")
  void search_shouldEnrichResultsWithBookmarkedTrue() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build();

    var result = createResult(36834L, "00010002");
    Page<ReportingUnitSearchResultDto> page = new PageImpl<>(List.of(result), PAGEABLE, 1);

    when(legacyApiProvider.searchReportingUnit(any(), any())).thenReturn(page);
    when(forestClientService.getClientByNumber("00010002"))
        .thenReturn(
            Optional.of(
                new ForestClientDto("00010002", "WEST FRASER", null, null, null, null, null)));
    when(userService.getUserBookmarksInList(USER_ID, List.of(36834L))).thenReturn(List.of(36834L));

    Page<ReportingUnitSearchResultDto> results = searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).hasSize(1);
    assertThat(results.getContent().getFirst().bookmarked()).isTrue();
    assertThat(results.getContent().getFirst().client().description()).isEqualTo("WEST FRASER");
  }

  @Test
  @DisplayName("Search should enrich results with bookmarked=false when RU is not bookmarked")
  void search_shouldEnrichResultsWithBookmarkedFalse() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build();

    var result = createResult(36834L, "00010002");
    Page<ReportingUnitSearchResultDto> page = new PageImpl<>(List.of(result), PAGEABLE, 1);

    when(legacyApiProvider.searchReportingUnit(any(), any())).thenReturn(page);
    when(forestClientService.getClientByNumber("00010002"))
        .thenReturn(
            Optional.of(
                new ForestClientDto("00010002", "WEST FRASER", null, null, null, null, null)));
    when(userService.getUserBookmarksInList(USER_ID, List.of(36834L))).thenReturn(List.of());

    Page<ReportingUnitSearchResultDto> results = searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).hasSize(1);
    assertThat(results.getContent().getFirst().bookmarked()).isFalse();
  }

  @Test
  @DisplayName("Search with bookmarked=true should fetch user bookmarks and set reportingUnitIds")
  void search_withBookmarkedTrue_shouldSetReportingUnitIds() {
    var filters = ReportingUnitSearchParametersDto.builder().bookmarked(true).build();

    // User has bookmarks for RU 36834 and 12345
    when(userService.getUserBookmarksInList(USER_ID, List.of()))
        .thenReturn(List.of(36834L, 12345L));

    var result = createResult(36834L, "00010002");
    Page<ReportingUnitSearchResultDto> page = new PageImpl<>(List.of(result), PAGEABLE, 1);

    when(legacyApiProvider.searchReportingUnit(any(), any())).thenReturn(page);
    when(forestClientService.getClientByNumber("00010002"))
        .thenReturn(
            Optional.of(
                new ForestClientDto("00010002", "WEST FRASER", null, null, null, null, null)));
    when(userService.getUserBookmarksInList(USER_ID, List.of(36834L))).thenReturn(List.of(36834L));

    Page<ReportingUnitSearchResultDto> results = searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).hasSize(1);
    assertThat(results.getContent().getFirst().bookmarked()).isTrue();
    // Verify that bookmarks were fetched to set the reportingUnitIds filter
    assertThat(filters.getReportingUnitIds()).containsExactly(36834L, 12345L);
  }

  @Test
  @DisplayName("Search with bookmarked=false should not fetch user bookmarks for filtering")
  void search_withBookmarkedFalse_shouldNotFetchBookmarksForFiltering() {
    var filters =
        ReportingUnitSearchParametersDto.builder()
            .mainSearchTerm("36834")
            .bookmarked(false)
            .build();

    Page<ReportingUnitSearchResultDto> page = new PageImpl<>(List.of(), PAGEABLE, 0);

    when(legacyApiProvider.searchReportingUnit(any(), any())).thenReturn(page);
    when(userService.getUserBookmarksInList(eq(USER_ID), any())).thenReturn(List.of());

    searchService.search(USER_ID, filters, PAGEABLE);

    // The reportingUnitIds filter should NOT have been set (bookmarked is false)
    assertThat(filters.getReportingUnitIds()).isNull();
  }

  @Test
  @DisplayName("Search with empty results should return empty page with no enrichment errors")
  void search_withEmptyResults_shouldReturnEmptyPage() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("99999").build();

    Page<ReportingUnitSearchResultDto> page = new PageImpl<>(List.of(), PAGEABLE, 0);

    when(legacyApiProvider.searchReportingUnit(any(), any())).thenReturn(page);
    when(userService.getUserBookmarksInList(eq(USER_ID), eq(List.of()))).thenReturn(List.of());

    Page<ReportingUnitSearchResultDto> results = searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).isEmpty();
    verify(forestClientService, never()).getClientByNumber(anyString());
  }

  @Test
  @DisplayName("Search with multiple results should correctly flag only bookmarked ones")
  void search_withMultipleResults_shouldFlagOnlyBookmarked() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("test").build();

    var result1 = createResult(36834L, "00010002");
    var result2 = createResult(12345L, "00010002");
    Page<ReportingUnitSearchResultDto> page =
        new PageImpl<>(List.of(result1, result2), PAGEABLE, 2);

    when(legacyApiProvider.searchReportingUnit(any(), any())).thenReturn(page);
    when(forestClientService.getClientByNumber("00010002"))
        .thenReturn(
            Optional.of(
                new ForestClientDto("00010002", "WEST FRASER", null, null, null, null, null)));
    // Only RU 36834 is bookmarked
    when(userService.getUserBookmarksInList(USER_ID, List.of(36834L, 12345L)))
        .thenReturn(List.of(36834L));

    Page<ReportingUnitSearchResultDto> results = searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).hasSize(2);
    assertThat(results.getContent().get(0).bookmarked()).isTrue();
    assertThat(results.getContent().get(1).bookmarked()).isFalse();
  }

  @Test
  @DisplayName("Search with legacy source should call only the legacy provider (issue #1238)")
  void search_sourceLegacy_shouldCallOnlyLegacyProvider() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build();

    var result = createResult(36834L, "00010002");
    Page<ReportingUnitSearchResultDto> page = new PageImpl<>(List.of(result), PAGEABLE, 1);

    when(legacyApiProvider.searchReportingUnit(filters, PAGEABLE)).thenReturn(page);
    when(forestClientService.getClientByNumber("00010002"))
        .thenReturn(
            Optional.of(
                new ForestClientDto("00010002", "WEST FRASER", null, null, null, null, null)));
    when(userService.getUserBookmarksInList(eq(USER_ID), any())).thenReturn(List.of());

    Page<ReportingUnitSearchResultDto> results = searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).hasSize(1);
    verify(legacyApiProvider, times(1)).searchReportingUnit(filters, PAGEABLE);
    verify(postgresSearchProvider, never()).searchReportingUnit(any(), any());
  }

  @Test
  @DisplayName("Search with PostgreSQL source should fail with 501 and not call legacy (issue #1238)")
  void search_sourcePostgres_shouldFailNotImplemented_withoutCallingLegacy() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build();
    // legacy=false selects the PostgreSQL source (issue #1238, DEC-011)
    filters.setLegacy("false");

    when(postgresSearchProvider.searchReportingUnit(filters, PAGEABLE))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.NOT_IMPLEMENTED,
                "PostgreSQL reporting-unit search is not implemented yet (issue #1238)"));

    assertThatThrownBy(() -> searchService.search(USER_ID, filters, PAGEABLE))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_IMPLEMENTED));

    verify(legacyApiProvider, never()).searchReportingUnit(any(), any());
  }

  @Test
  @DisplayName("Legacy provider failure should propagate without PostgreSQL fallback (DEC-004)")
  void search_legacyFailure_shouldPropagate_withoutPostgresFallback() {
    // legacy flag absent resolves to the LEGACY source (issue #1238, DEC-011)
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build();

    when(legacyApiProvider.searchReportingUnit(filters, PAGEABLE))
        .thenThrow(new RuntimeException("legacy unavailable"));

    assertThatThrownBy(() -> searchService.search(USER_ID, filters, PAGEABLE))
        .isInstanceOf(RuntimeException.class)
        .hasMessage("legacy unavailable");

    verify(postgresSearchProvider, never()).searchReportingUnit(any(), any());
  }
}

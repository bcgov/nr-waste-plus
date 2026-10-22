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
  @DisplayName("Search with PostgreSQL source should dispatch to the PG provider only (issue #1238)")
  void search_sourcePostgres_shouldDispatchToPostgres_withoutCallingLegacy() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build();
    // legacy=false selects the PostgreSQL source (issue #1238, DEC-011)
    filters.setLegacy("false");

    var result = createResult(36834L, "00010002");
    Page<ReportingUnitSearchResultDto> page = new PageImpl<>(List.of(result), PAGEABLE, 1);

    when(postgresSearchProvider.searchReportingUnit(filters, PAGEABLE)).thenReturn(page);
    when(forestClientService.getClientByNumber("00010002"))
        .thenReturn(
            Optional.of(
                new ForestClientDto("00010002", "WEST FRASER", null, null, null, null, null)));
    when(userService.getUserBookmarksInList(eq(USER_ID), any())).thenReturn(List.of());

    Page<ReportingUnitSearchResultDto> results =
        searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).hasSize(1);
    assertThat(results.getContent().getFirst().bookmarked()).isFalse();
    verify(postgresSearchProvider, times(1)).searchReportingUnit(filters, PAGEABLE);
    verify(legacyApiProvider, never()).searchReportingUnit(any(), any());
  }

  @Test
  @DisplayName("PostgreSQL rows get district descriptions filled with the legacy stripping rule")
  void search_sourcePostgres_shouldEnrichDistrictDescriptions() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build();
    filters.setLegacy("false");

    // PG rows ship NULL descriptions (DEC-016); the district description carries the suffix the
    // legacy mapper strips.
    var result =
        new ReportingUnitSearchResultDto(
            null,
            null,
            "BLK-A",
            3L,
            new CodeDescriptionDto("00010002", null),
            "tfl01",
            "12",
            "ab12",
            false,
            false,
            new CodeDescriptionDto("AVG", "Average"),
            new CodeDescriptionDto("P00", null),
            new CodeDescriptionDto("DRAFT", null),
            java.time.LocalDateTime.of(2026, 1, 1, 0, 0),
            false);
    when(postgresSearchProvider.searchReportingUnit(filters, PAGEABLE))
        .thenReturn(new PageImpl<>(List.of(result), PAGEABLE, 1));
    when(legacyApiProvider.getDistrictCodes())
        .thenReturn(
            List.of(
                new CodeDescriptionDto("P00", "P00 Natural Resource District"),
                new CodeDescriptionDto("DND", "Nadina Natural Resource District")));
    when(forestClientService.getClientByNumber("00010002")).thenReturn(Optional.empty());
    when(userService.getUserBookmarksInList(eq(USER_ID), any())).thenReturn(List.of());

    Page<ReportingUnitSearchResultDto> results =
        searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).hasSize(1);
    // Stripped exactly like the legacy mapper (MapperConstants.DISTRICT_AS_DTO).
    assertThat(results.getContent().getFirst().district().description()).isEqualTo("P00");
    verify(legacyApiProvider, times(1)).getDistrictCodes();
    verify(legacyApiProvider, never()).searchReportingUnit(any(), any());
  }

  @Test
  @DisplayName("District enrichment: lookup miss keeps the NULL description; rows intact")
  void search_sourcePostgres_districtMiss_shouldKeepNull() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build();
    filters.setLegacy("false");

    var result =
        new ReportingUnitSearchResultDto(
            null,
            null,
            null,
            4L,
            new CodeDescriptionDto("00010003", null),
            null,
            null,
            null,
            false,
            false,
            new CodeDescriptionDto("AVG", "Average"),
            new CodeDescriptionDto("ZZZ", null),
            null,
            java.time.LocalDateTime.of(2026, 1, 1, 0, 0),
            false);
    when(postgresSearchProvider.searchReportingUnit(filters, PAGEABLE))
        .thenReturn(new PageImpl<>(List.of(result), PAGEABLE, 1));
    // Circuit-breaker fallback shape: a partial list without the requested code.
    when(legacyApiProvider.getDistrictCodes())
        .thenReturn(List.of(new CodeDescriptionDto("DCC", "Cariboo-Chilcotin")));
    when(forestClientService.getClientByNumber("00010003")).thenReturn(Optional.empty());
    when(userService.getUserBookmarksInList(eq(USER_ID), any())).thenReturn(List.of());

    Page<ReportingUnitSearchResultDto> results =
        searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).hasSize(1);
    assertThat(results.getContent().getFirst().district().code()).isEqualTo("ZZZ");
    assertThat(results.getContent().getFirst().district().description()).isNull();
  }

  @Test
  @DisplayName("District enrichment failure never fails the request (rows intact)")
  void search_sourcePostgres_enrichmentFailure_shouldKeepRows() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build();
    filters.setLegacy("false");

    var result =
        new ReportingUnitSearchResultDto(
            null,
            null,
            null,
            5L,
            new CodeDescriptionDto("00010002", null),
            null,
            null,
            null,
            false,
            false,
            new CodeDescriptionDto("AVG", "Average"),
            new CodeDescriptionDto("P00", null),
            null,
            java.time.LocalDateTime.of(2026, 1, 1, 0, 0),
            false);
    when(postgresSearchProvider.searchReportingUnit(filters, PAGEABLE))
        .thenReturn(new PageImpl<>(List.of(result), PAGEABLE, 1));
    when(legacyApiProvider.getDistrictCodes()).thenThrow(new RuntimeException("legacy down"));
    when(forestClientService.getClientByNumber("00010002")).thenReturn(Optional.empty());
    when(userService.getUserBookmarksInList(eq(USER_ID), any())).thenReturn(List.of());

    Page<ReportingUnitSearchResultDto> results =
        searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).hasSize(1);
    assertThat(results.getContent().getFirst().district().description()).isNull();
    assertThat(results.getContent().getFirst().ruNumber()).isEqualTo(5L);
  }

  @Test
  @DisplayName("Legacy rows are not district-enriched (no lookup call, output unchanged)")
  void search_sourceLegacy_shouldNotEnrichDistrictDescriptions() {
    var filters = ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build();

    var result = createResult(36834L, "00010002");
    Page<ReportingUnitSearchResultDto> page = new PageImpl<>(List.of(result), PAGEABLE, 1);

    when(legacyApiProvider.searchReportingUnit(filters, PAGEABLE)).thenReturn(page);
    when(forestClientService.getClientByNumber("00010002"))
        .thenReturn(
            Optional.of(
                new ForestClientDto("00010002", "WEST FRASER", null, null, null, null, null)));
    when(userService.getUserBookmarksInList(eq(USER_ID), any())).thenReturn(List.of());

    Page<ReportingUnitSearchResultDto> results =
        searchService.search(USER_ID, filters, PAGEABLE);

    assertThat(results.getContent()).hasSize(1);
    // Legacy rows arrive with descriptions from the legacy SQL joins — untouched.
    assertThat(results.getContent().getFirst().district().description())
        .isEqualTo("Nadina Natural Resource District");
    verify(legacyApiProvider, never()).getDistrictCodes();
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

  @Test
  @DisplayName("Search with null filters preserves the legacy source and avoids a null dereference")
  void search_nullFilters_shouldUseLegacyProvider() {
    Page<ReportingUnitSearchResultDto> page = Page.empty(PAGEABLE);
    when(legacyApiProvider.searchReportingUnit(any(), eq(PAGEABLE))).thenReturn(page);
    when(userService.getUserBookmarksInList(USER_ID, List.of())).thenReturn(List.of());

    Page<ReportingUnitSearchResultDto> result = searchService.search(USER_ID, null, PAGEABLE);

    assertThat(result).isEmpty();
    verify(legacyApiProvider).searchReportingUnit(any(ReportingUnitSearchParametersDto.class),
        eq(PAGEABLE));
    verify(postgresSearchProvider, never()).searchReportingUnit(any(), any());
  }
}

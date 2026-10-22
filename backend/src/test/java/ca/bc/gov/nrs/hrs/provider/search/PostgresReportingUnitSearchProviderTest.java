package ca.bc.gov.nrs.hrs.provider.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.exception.InvalidSortingFieldException;
import ca.bc.gov.nrs.hrs.repository.PostgresReportingUnitSearchFilter;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchExpandedRow;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchQueryConstants;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchRepository;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchRow;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.JpaSort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

/**
 * Unit tests for the PostgreSQL search provider: the DEC-008 client-scope derivation, the
 * sort-key allowlist with tie-breakers (legacy {@code PaginationUtil.resolveSort} parity), and
 * the legacy two-parameter repository invocation with Tuple→DTO row mapping.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Postgres Reporting Unit Search Provider")
class PostgresReportingUnitSearchProviderTest {

  @Mock
  private ReportingUnitSearchRepository searchRepository;

  @Mock
  private ReportingUnitSearchExpandedRow expandedRow;

  @InjectMocks
  private PostgresReportingUnitSearchProvider provider;

  @BeforeEach
  void setUpSecurityContext() {
    Jwt jwt = Jwt.withTokenValue("token")
        .header("alg", "none")
        .subject("test")
        .claim("custom:idp_name", "idir")
        .claim("cognito:groups", List.of("Viewer_00010002"))
        .build();
    SecurityContextHolder.getContext()
        .setAuthentication(new JwtAuthenticationToken(jwt));
  }

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  @DisplayName("isUnscoped: absent, empty, and single-sentinel client lists derive scope")
  void isUnscoped_shouldMatchLegacyFallbackConditions() {
    assertThat(PostgresReportingUnitSearchProvider.isUnscoped(null)).isTrue();
    assertThat(PostgresReportingUnitSearchProvider.isUnscoped(List.of())).isTrue();
    assertThat(
            PostgresReportingUnitSearchProvider.isUnscoped(
                List.of(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE)))
        .isTrue();
    assertThat(PostgresReportingUnitSearchProvider.isUnscoped(List.of("00010002"))).isFalse();
    // A list merely CONTAINING the sentinel is explicit and binds verbatim (never a grant).
    assertThat(
            PostgresReportingUnitSearchProvider.isUnscoped(
                List.of(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE, "00010002")))
        .isFalse();
  }

  @Test
  @DisplayName("deriveClientScope: IDIR unrestricted; non-IDIR requires role scope (DEC-008)")
  void deriveClientScope_shouldReserveUnrestrictedScopeForIdir() {
    // IDIR: roles never grant scope; the sentinel explicitly represents the DEC-008 unrestricted
    // policy.
    assertThat(PostgresReportingUnitSearchProvider.deriveClientScope(true, List.of()))
        .containsExactly(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE);
    assertThat(PostgresReportingUnitSearchProvider.deriveClientScope(true, List.of("00010002")))
        .containsExactly(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE);
    // A non-IDIR principal with role clients is scoped to exactly those clients.
    assertThat(
            PostgresReportingUnitSearchProvider.deriveClientScope(false, List.of("A", "B")))
        .containsExactly("A", "B");
    // Missing non-IDIR scope must not become the unrestricted SQL sentinel.
    assertThatThrownBy(
            () -> PostgresReportingUnitSearchProvider.deriveClientScope(false, List.of()))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("No client scope");
    assertThatThrownBy(
            () -> PostgresReportingUnitSearchProvider.deriveClientScope(false, null))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("No client scope");
  }

  @Test
  @DisplayName("searchReportingUnit: BCeID role scope is passed to the repository")
  void searchReportingUnit_bceidWithRoles_shouldBindRoleClients() {
    setAuthentication("bceidbusiness", List.of("Viewer_00010002", "Submitter_00010003"));
    var filters = ReportingUnitSearchParametersDto.builder()
        .district(List.of("DQC"))
        .build();
    filters.setLegacy("false");
    when(searchRepository.searchReportingUnits(any(PostgresReportingUnitSearchFilter.class),
        any(Pageable.class)))
        .thenReturn(Page.empty());

    provider.searchReportingUnit(filters, PageRequest.of(0, 10));

    ArgumentCaptor<PostgresReportingUnitSearchFilter> filterCaptor =
        ArgumentCaptor.forClass(PostgresReportingUnitSearchFilter.class);
    verify(searchRepository).searchReportingUnits(filterCaptor.capture(), any(Pageable.class));
    assertThat(filterCaptor.getValue().getClientNumbers())
        .containsExactlyInAnyOrder("00010002", "00010003");
  }

  @Test
  @DisplayName("searchReportingUnit: BCeID without roles is forbidden before repository access")
  void searchReportingUnit_bceidWithoutRoles_shouldDenyBeforeRepositoryCall() {
    setAuthentication("bceidbusiness", List.of());
    var filters = ReportingUnitSearchParametersDto.builder()
        .district(List.of("DQC"))
        .build();
    filters.setLegacy("false");

    assertThatThrownBy(() -> provider.searchReportingUnit(filters, PageRequest.of(0, 10)))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(exception -> ((ResponseStatusException) exception).getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    verify(searchRepository, never())
        .searchReportingUnits(any(PostgresReportingUnitSearchFilter.class), any(Pageable.class));
  }

  @Test
  @DisplayName("bookmarked search with no bookmark ids returns empty before client resolution")
  void searchReportingUnit_bookmarkedWithoutIds_shouldReturnEmptyPage() {
    var filters = ReportingUnitSearchParametersDto.builder()
        .bookmarked(true)
        .build();
    filters.setLegacy("false");
    Pageable pageable = PageRequest.of(2, 10);

    Page<ReportingUnitSearchResultDto> result = provider.searchReportingUnit(filters, pageable);

    assertThat(result).isEmpty();
    assertThat(result.getTotalElements()).isZero();
    assertThat(result.getPageable()).isEqualTo(pageable);
    verify(searchRepository, never())
        .searchReportingUnits(any(PostgresReportingUnitSearchFilter.class), any(Pageable.class));
  }

  @Test
  @DisplayName("getSearchExpanded maps expanded fields and parses secondary marks")
  void getSearchExpanded_shouldMapProjection() {
    when(searchRepository.findExpanded(17L, 23L)).thenReturn(Optional.of(expandedRow));
    when(expandedRow.getId()).thenReturn(23L);
    when(expandedRow.getLicenseNo()).thenReturn("TFL01");
    when(expandedRow.getCuttingPermit()).thenReturn("CP01");
    when(expandedRow.getTimberMark()).thenReturn("TM01");
    when(expandedRow.getExempted()).thenReturn(false);
    when(expandedRow.getMultiMark()).thenReturn(true);
    when(expandedRow.getStatusCode()).thenReturn("DFT");
    when(expandedRow.getSecondary()).thenReturn(
        "[{\"mark\":\"TM02\",\"status\":{\"code\":null,\"description\":null},"
            + "\"area\":null}]");
    when(expandedRow.getNetArea()).thenReturn(new BigDecimal("12.500"));
    when(expandedRow.getMarkArea()).thenReturn(null);
    when(expandedRow.getSubmitter()).thenReturn("Submitter");
    when(expandedRow.getAttachmentId()).thenReturn(42L);
    when(expandedRow.getAttachmentName()).thenReturn("map.pdf");
    when(expandedRow.getComments()).thenReturn("Comment");
    when(expandedRow.getTotalBlockCount()).thenReturn(2L);
    when(expandedRow.getTotalChildCount()).thenReturn(1L);

    Optional<ReportingUnitSearchExpandedDto> result = provider.getSearchExpanded(17L, 23L);

    assertThat(result).isPresent();
    ReportingUnitSearchExpandedDto expanded = result.orElseThrow();
    assertThat(expanded.id()).isEqualTo(23L);
    assertThat(expanded.licenseNo()).isEqualTo("TFL01");
    assertThat(expanded.cuttingPermit()).isEqualTo("CP01");
    assertThat(expanded.timberMark()).isEqualTo("TM01");
    assertThat(expanded.exempted()).isFalse();
    assertThat(expanded.multiMark()).isTrue();
    assertThat(expanded.status().code()).isEqualTo("DFT");
    assertThat(expanded.secondaryMarks()).hasSize(1);
    assertThat(expanded.secondaryMarks().getFirst().mark()).isEqualTo("TM02");
    assertThat(expanded.netArea()).isEqualTo(12.5);
    assertThat(expanded.markArea()).isNull();
    assertThat(expanded.submitter()).isEqualTo("Submitter");
    assertThat(expanded.attachment().code()).isEqualTo("42");
    assertThat(expanded.attachment().description()).isEqualTo("map.pdf");
    assertThat(expanded.comments()).isEqualTo("Comment");
    assertThat(expanded.totalBlocks()).isEqualTo(2L);
    assertThat(expanded.totalChildren()).isEqualTo(1L);
    verify(searchRepository).findExpanded(eq(17L), eq(23L));
  }

  @Test
  @DisplayName("getSearchExpanded: absent and malformed secondary JSON produce an empty list")
  void getSearchExpanded_invalidSecondary_shouldReturnEmptyList() {
    when(searchRepository.findExpanded(17L, 23L)).thenReturn(Optional.of(expandedRow));
    when(expandedRow.getSecondary()).thenReturn("not-json");
    when(expandedRow.getNetArea()).thenReturn(null);
    when(expandedRow.getMarkArea()).thenReturn(null);

    assertThat(provider.getSearchExpanded(17L, 23L))
        .get()
        .extracting(ReportingUnitSearchExpandedDto::secondaryMarks)
        .asList()
        .isEmpty();

    when(expandedRow.getSecondary()).thenReturn("  ");
    assertThat(provider.getSearchExpanded(17L, 23L))
        .get()
        .extracting(ReportingUnitSearchExpandedDto::secondaryMarks)
        .asList()
        .isEmpty();
  }

  @Test
  @DisplayName("getSearchExpanded: no matching projection stays empty")
  void getSearchExpanded_missingRow_shouldRemainEmpty() {
    when(searchRepository.findExpanded(17L, 23L)).thenReturn(Optional.empty());

    assertThat(provider.getSearchExpanded(17L, 23L)).isEmpty();
  }

  private void setAuthentication(String idp, List<String> groups) {
    Jwt jwt = Jwt.withTokenValue("token")
        .header("alg", "none")
        .subject("test")
        .claim("custom:idp_name", idp)
        .claim("cognito:groups", groups)
        .build();
    SecurityContextHolder.getContext()
        .setAuthentication(new JwtAuthenticationToken(jwt));
  }

  @Test
  @DisplayName("resolveSort: default sort is lastUpdated DESC plus tie-breakers")
  void resolveSort_unsorted_shouldDefaultWithTieBreakers() {
    JpaSort resolved = provider.resolveSort(Sort.unsorted());

    assertThat(resolved)
        .extracting(order -> order.getProperty() + " " + order.getDirection())
        .containsExactly(
            "(ru.updated_at) DESC",
            "(ru.reporting_unit_id) ASC",
            "(b.block_id) ASC");
  }

  @Test
  @DisplayName("resolveSort: allowlisted sort keys map to fixed fragments")
  void resolveSort_allowlistedKeys_shouldMapFragments() {
    JpaSort resolved = provider.resolveSort(Sort.by(Sort.Direction.ASC, "timberMark"));

    assertThat(resolved)
        .extracting(order -> order.getProperty() + " " + order.getDirection())
        .containsExactly(
            "(pm.timber_mark) ASC",
            "(ru.reporting_unit_id) ASC",
            "(b.block_id) ASC");
  }

  @Test
  @DisplayName("resolveSort: unknown sort key is rejected (428)")
  void resolveSort_unknownKey_shouldReject() {
    assertThatThrownBy(() -> provider.resolveSort(Sort.by("bogusField")))
        .isInstanceOf(InvalidSortingFieldException.class)
        .hasMessageContaining("bogusField");
  }

  @Test
  @DisplayName("resolveSort: unsupported WAA id is rejected; sampling uses safe constants")
  void resolveSort_degenerateKeys_shouldRejectAndSamplingShouldResolve() {
    for (String key : List.of("wasteAssessmentAreaId")) {
      assertThatThrownBy(() -> provider.resolveSort(Sort.by(key)))
          .as(key)
          .isInstanceOf(InvalidSortingFieldException.class);
    }

    for (String key : List.of("sampling", "sampling.code", "sampling.description")) {
      assertThat(provider.resolveSort(Sort.by(Sort.Direction.ASC, key)))
          .extracting(order -> order.getProperty() + " " + order.getDirection())
          .containsExactly(
              key.equals("sampling.description") ? "(upper('Average')) ASC" : "(upper('AVG')) ASC",
              "(ru.reporting_unit_id) ASC",
              "(b.block_id) ASC");
    }
  }

  @Test
  @DisplayName("resolveSort: multi-key sort preserves order and appends tie-breakers")
  void resolveSort_multiKey_shouldPreserveOrderWithTieBreakers() {
    Sort requested =
        Sort.by(Sort.Direction.ASC, "ruNumber").and(Sort.by(Sort.Direction.DESC, "lastUpdated"));

    JpaSort resolved = provider.resolveSort(requested);

    List<String> rendered =
        resolved.stream().map(order -> order.getProperty() + " " + order.getDirection()).toList();
    assertThat(rendered.indexOf("(ru.reporting_unit_id) ASC"))
        .isLessThan(rendered.indexOf("(ru.updated_at) DESC"));
    assertThat(rendered.getLast()).isEqualTo("(b.block_id) ASC");
  }

  @Test
  @DisplayName("searchReportingUnit invokes the repository with the legacy two-param shape")
  void searchReportingUnit_shouldCallRepositoryWithFilterAndPage() {
    var filters = ReportingUnitSearchParametersDto.builder()
        .mainSearchTerm("36834")
        .district(List.of("dqc"))
        .build();
    // legacy=false selects the PostgreSQL source (issue #1238, DEC-011)
    filters.setLegacy("false");

    when(searchRepository.searchReportingUnits(any(PostgresReportingUnitSearchFilter.class),
        any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(row()), PageRequest.of(0, 10), 1));

    Page<ReportingUnitSearchResultDto> results =
        provider.searchReportingUnit(filters, PageRequest.of(0, 10));

    assertThat(results.getContent()).hasSize(1);
    assertThat(results.getContent().getFirst().ruNumber()).isEqualTo(3L);
    assertThat(results.getContent().getFirst().cutBlockId()).isEqualTo("BLK-A");
    assertThat(results.getContent().getFirst().client().code()).isEqualTo("00010002");
    assertThat(results.getContent().getFirst().sampling().code()).isEqualTo("AVG");
    assertThat(results.getContent().getFirst().status().code()).isEqualTo("DRAFT");
    assertThat(results.getContent().getFirst().wasteAssessmentAreaId()).isNull();
    assertThat(results.getContent().getFirst().id()).isNull();
    assertThat(results.getContent().getFirst().bookmarked()).isFalse();

    ArgumentCaptor<PostgresReportingUnitSearchFilter> filterCaptor =
        ArgumentCaptor.forClass(PostgresReportingUnitSearchFilter.class);
    ArgumentCaptor<Pageable> pageCaptor = ArgumentCaptor.forClass(Pageable.class);
    verify(searchRepository).searchReportingUnits(filterCaptor.capture(), pageCaptor.capture());

    PostgresReportingUnitSearchFilter bound = filterCaptor.getValue();
    assertThat(bound.getMainSearchTerm()).isEqualTo("36834");
    assertThat(bound.getDistrict()).containsExactly("DQC");
    assertThat(bound.getClientNumbers())
        .containsExactly(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE);

    Pageable page = pageCaptor.getValue();
    assertThat(page.getPageNumber()).isZero();
    assertThat(page.getPageSize()).isEqualTo(10);
    assertThat(page.getSort())
        .extracting(order -> order.getProperty() + " " + order.getDirection())
        .containsExactly(
            "(ru.updated_at) DESC",
            "(ru.reporting_unit_id) ASC",
            "(b.block_id) ASC");
  }

  @Test
  @DisplayName("searchReportingUnit rejects an out-of-range numeric term with HTTP 400")
  void searchReportingUnit_numericOverflow_shouldReject400() {
    var filters = ReportingUnitSearchParametersDto.builder()
        .mainSearchTerm("99999999999999999999")
        .build();
    filters.setLegacy("false");

    assertThatThrownBy(() -> provider.searchReportingUnit(filters, PageRequest.of(0, 10)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("numeric search term out of range");

    verify(searchRepository, org.mockito.Mockito.never())
        .searchReportingUnits(any(PostgresReportingUnitSearchFilter.class), any(Pageable.class));
  }

  private ReportingUnitSearchRow row() {
    return new ReportingUnitSearchRow() {
      @Override
      public Long getRuNumber() {
        return 3L;
      }

      @Override
      public Long getBlockId() {
        return 11L;
      }

      @Override
      public Long getWasteAssessmentAreaId() {
        return null;
      }

      @Override
      public String getCutBlockId() {
        return "BLK-A";
      }

      @Override
      public String getClientCode() {
        return "00010002";
      }

      @Override
      public String getClientName() {
        return null;
      }

      @Override
      public String getLicenseNumber() {
        return "tfl01";
      }

      @Override
      public String getCuttingPermit() {
        return "12";
      }

      @Override
      public String getTimberMark() {
        return "ab12";
      }

      @Override
      public Boolean getMultiMark() {
        return false;
      }

      @Override
      public Boolean getSecondaryEntry() {
        return false;
      }

      @Override
      public String getSamplingCode() {
        return "AVG";
      }

      @Override
      public String getSamplingName() {
        return "Average";
      }

      @Override
      public String getDistrictCode() {
        return "P00";
      }

      @Override
      public String getDistrictName() {
        return null;
      }

      @Override
      public String getStatusCode() {
        return "DRAFT";
      }

      @Override
      public String getStatusName() {
        return null;
      }

      @Override
      public Instant getLastUpdated() {
        return Instant.parse("2026-01-01T00:00:00Z");
      }
    };
  }
}

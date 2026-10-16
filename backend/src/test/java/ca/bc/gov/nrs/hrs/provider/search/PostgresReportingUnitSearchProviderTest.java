package ca.bc.gov.nrs.hrs.provider.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.exception.InvalidSortingFieldException;
import ca.bc.gov.nrs.hrs.repository.PostgresReportingUnitSearchFilter;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchQueryConstants;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchRepository;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchRow;
import java.time.Instant;
import java.util.List;
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
  @DisplayName("deriveClientScope: IDIR is always unrestricted; non-IDIR derives roles (DEC-008)")
  void deriveClientScope_shouldMirrorLegacyEnrichFilters() {
    // IDIR: derived list is always empty -> sentinel -> unrestricted, roles never grant scope
    // (legacy: userClientNumbers = IDIR ? List.of() : roles).
    assertThat(PostgresReportingUnitSearchProvider.deriveClientScope(true, List.of()))
        .containsExactly(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE);
    assertThat(PostgresReportingUnitSearchProvider.deriveClientScope(true, List.of("00010002")))
        .containsExactly(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE);
    // Non-IDIR with roles: role clients apply.
    assertThat(
            PostgresReportingUnitSearchProvider.deriveClientScope(false, List.of("A", "B")))
        .containsExactly("A", "B");
    // Non-IDIR with zero roles: re-normalizes to the sentinel (legacy inferred edge).
    assertThat(PostgresReportingUnitSearchProvider.deriveClientScope(false, List.of()))
        .containsExactly(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE);
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
  @DisplayName("resolveSort: degenerate PG sort keys (wasteAssessmentAreaId, sampling) are rejected")
  void resolveSort_degenerateKeys_shouldReject() {
    for (String key : List.of("wasteAssessmentAreaId", "sampling", "sampling.code")) {
      assertThatThrownBy(() -> provider.resolveSort(Sort.by(key)))
          .as(key)
          .isInstanceOf(InvalidSortingFieldException.class);
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

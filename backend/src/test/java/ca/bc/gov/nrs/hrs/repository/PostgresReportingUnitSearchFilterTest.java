package ca.bc.gov.nrs.hrs.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

/**
 * Unit tests for the PostgreSQL search filter's getter-side normalization contract (spec §5 +
 * DECISION): sentinel binding for absent filters, uppercase-at-binding, and the numeric-term
 * range guard. Mirrors the legacy DTO-getter normalization, one layer down (the shared modern
 * DTO stays field-clean).
 */
@DisplayName("Unit Test | Postgres Reporting Unit Search Filter")
class PostgresReportingUnitSearchFilterTest {

  private static final String NOVALUE = ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE;

  @Test
  @DisplayName("getters: absent/empty collections bind sentinels — never null or empty")
  void getters_emptyCollections_shouldBindSentinels() {
    var filter = PostgresReportingUnitSearchFilter.from(
        ReportingUnitSearchParametersDto.builder().build(), List.of());

    assertThat(filter.getDistrict()).containsExactly(NOVALUE);
    assertThat(filter.getClientNumbers()).containsExactly(NOVALUE);
    assertThat(filter.getReportingUnitIds())
        .containsExactly(ReportingUnitSearchQueryConstants.SENTINEL_REPORTING_UNIT);
  }

  @Test
  @DisplayName("getters: explicitly empty collections still bind sentinels (guard)")
  void getters_explicitEmptyCollections_shouldBindSentinels() {
    var filter = PostgresReportingUnitSearchFilter.from(
        ReportingUnitSearchParametersDto.builder()
            .district(List.of())
            .reportingUnitIds(List.of())
            .build(),
        List.of());

    assertThat(filter.getDistrict()).containsExactly(NOVALUE);
    assertThat(filter.getReportingUnitIds())
        .containsExactly(ReportingUnitSearchQueryConstants.SENTINEL_REPORTING_UNIT);
  }

  @Test
  @DisplayName("getters: district and mark-level scalars uppercased; clientNumbers as-is")
  void getters_uppercasing_shouldFollowLegacyPrecedent() {
    var filter = PostgresReportingUnitSearchFilter.from(
        ReportingUnitSearchParametersDto.builder()
            .district(List.of("dqc"))
            .licenseeId("tfl01")
            .cuttingPermitId("cp1")
            .timberMark("tm1")
            .build(),
        List.of("Client-1"));

    assertThat(filter.getDistrict()).containsExactly("DQC");
    assertThat(filter.getLicenseeId()).isEqualTo("TFL01");
    assertThat(filter.getCuttingPermitId()).isEqualTo("CP1");
    assertThat(filter.getTimberMark()).isEqualTo("TM1");
    // clientNumbers are never uppercased (legacy parity).
    assertThat(filter.getClientNumbers()).containsExactly("Client-1");
  }

  @Test
  @DisplayName("getters: absent/blank scalars bind the 'NOVALUE' sentinel (typed bind)")
  void getters_blankScalars_shouldBindSentinel() {
    var filter = PostgresReportingUnitSearchFilter.from(
        ReportingUnitSearchParametersDto.builder()
            .mainSearchTerm("  ")
            .licenseeId("")
            .cuttingPermitId(" ")
            .timberMark(null)
            .build(),
        List.of());

    assertThat(filter.getMainSearchTerm()).isEqualTo(NOVALUE);
    assertThat(filter.getLicenseeId()).isEqualTo(NOVALUE);
    assertThat(filter.getCuttingPermitId()).isEqualTo(NOVALUE);
    assertThat(filter.getTimberMark()).isEqualTo(NOVALUE);
  }

  @Test
  @DisplayName("from: 20-digit numeric search term is rejected with HTTP 400")
  void from_numericOverflow_shouldReject400() {
    var filters =
        ReportingUnitSearchParametersDto.builder().mainSearchTerm("99999999999999999999").build();

    assertThatThrownBy(() -> PostgresReportingUnitSearchFilter.from(filters, List.of()))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> {
              assertThat(ex.getStatusCode().value()).isEqualTo(400);
              assertThat(ex.getReason()).isEqualTo("numeric search term out of range");
            });
  }

  @Test
  @DisplayName("from: 19-digit term above bigint max is also rejected with 400")
  void from_longMaxOverflow_shouldReject400() {
    var filters =
        ReportingUnitSearchParametersDto.builder().mainSearchTerm("9999999999999999999").build();

    assertThatThrownBy(() -> PostgresReportingUnitSearchFilter.from(filters, List.of()))
        .isInstanceOf(ResponseStatusException.class);
  }

  @Test
  @DisplayName("from: leading-zero term within range passes the guard unchanged")
  void from_leadingZeroTerm_shouldPass() {
    var filter = PostgresReportingUnitSearchFilter.from(
        ReportingUnitSearchParametersDto.builder().mainSearchTerm("000000001").build(), List.of());

    assertThat(filter.getMainSearchTerm()).isEqualTo("000000001");
  }

  @Test
  @DisplayName("from: whitespace-padded numeric terms are trimmed before overflow validation")
  void from_whitespacePaddedOverflow_shouldReject400() {
    var filters = ReportingUnitSearchParametersDto.builder()
        .mainSearchTerm("  99999999999999999999  ")
        .build();

    assertThatThrownBy(() -> PostgresReportingUnitSearchFilter.from(filters, List.of()))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> {
              assertThat(ex.getStatusCode().value()).isEqualTo(400);
              assertThat(ex.getReason()).isEqualTo("numeric search term out of range");
            });
  }

  @Test
  @DisplayName("from: whitespace-padded valid numeric term binds without whitespace")
  void from_whitespacePaddedValidTerm_shouldBindTrimmedValue() {
    var filters = ReportingUnitSearchParametersDto.builder()
        .mainSearchTerm("  12345  ")
        .build();

    var filter = PostgresReportingUnitSearchFilter.from(filters, List.of());

    assertThat(filter.getMainSearchTerm()).isEqualTo("12345");
  }
}

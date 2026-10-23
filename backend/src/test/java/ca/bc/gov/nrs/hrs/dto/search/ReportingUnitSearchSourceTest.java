package ca.bc.gov.nrs.hrs.dto.search;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the lenient {@code legacy} query-parameter resolution contract of {@link
 * ReportingUnitSearchSource} (issue #1238, DEC-011): only the exact value {@code false} selects
 * the PostgreSQL source; every other value — including absent, {@code true}, case variants, and
 * garbage — selects the legacy source and never errors.
 */
@DisplayName("Unit Test | Reporting Unit Search Source")
class ReportingUnitSearchSourceTest {

  @Test
  @DisplayName("Absent parameter (null) resolves to legacy")
  void fromLegacyParam_null_shouldResolveLegacy() {
    assertThat(ReportingUnitSearchSource.fromLegacyParam(null))
        .isEqualTo(ReportingUnitSearchSource.LEGACY);
  }

  @Test
  @DisplayName("Exact value 'false' resolves to PostgreSQL")
  void fromLegacyParam_false_shouldResolvePostgres() {
    assertThat(ReportingUnitSearchSource.fromLegacyParam("false"))
        .isEqualTo(ReportingUnitSearchSource.POSTGRES);
  }

  @Test
  @DisplayName("Value 'true' resolves to legacy")
  void fromLegacyParam_true_shouldResolveLegacy() {
    assertThat(ReportingUnitSearchSource.fromLegacyParam("true"))
        .isEqualTo(ReportingUnitSearchSource.LEGACY);
  }

  @Test
  @DisplayName("Case variant 'FALSE' is not an exact match and resolves to legacy")
  void fromLegacyParam_upperCaseFalse_shouldResolveLegacy() {
    assertThat(ReportingUnitSearchSource.fromLegacyParam("FALSE"))
        .isEqualTo(ReportingUnitSearchSource.LEGACY);
  }

  @Test
  @DisplayName("Garbage value resolves to legacy (lenient, never an error)")
  void fromLegacyParam_garbage_shouldResolveLegacy() {
    assertThat(ReportingUnitSearchSource.fromLegacyParam("yes"))
        .isEqualTo(ReportingUnitSearchSource.LEGACY);
  }

  @Test
  @DisplayName("Empty value resolves to legacy")
  void fromLegacyParam_empty_shouldResolveLegacy() {
    assertThat(ReportingUnitSearchSource.fromLegacyParam(""))
        .isEqualTo(ReportingUnitSearchSource.LEGACY);
  }
}

package ca.bc.gov.nrs.hrs.dto.search;

/**
 * Selects the data source for reporting-unit searches ({@code GET /api/search/reporting-units}),
 * as introduced by issue #1238.
 *
 * <p>The source travels as the boolean query parameter {@code legacy} (DEC-011). Resolution is
 * deliberately <em>lenient</em>: only the exact value {@code false} (case-sensitive) selects
 * {@link #POSTGRES}; an absent parameter, {@code true}, or any other value (case variants,
 * garbage) selects {@link #LEGACY}. Unknown values must never produce an error and must never
 * select a non-legacy source, which is why the raw value is bound as a {@code String} and never
 * as a {@code Boolean} (Spring's Boolean conversion would reject unrecognized values with an
 * HTTP 400, contradicting the leniency contract).
 *
 * <p>Each request uses exactly one source: results are never merged and one source is never used
 * as a fallback for another (DEC-004).
 */
public enum ReportingUnitSearchSource {

  /** The legacy (Oracle-backed) reporting-unit API; the default source. */
  LEGACY,

  /** The PostgreSQL (HRS database) reporting-unit source. */
  POSTGRES;

  /**
   * Resolve the raw {@code legacy} query-parameter value to a search source.
   *
   * @param legacyParam the raw parameter value; {@code null} when the parameter is absent
   * @return {@link #POSTGRES} only when the value is exactly {@code false}; {@link #LEGACY} for
   *     every other input, including {@code null}, {@code true}, case variants such as {@code
   *     FALSE}, and unrecognized values
   */
  public static ReportingUnitSearchSource fromLegacyParam(String legacyParam) {
    return "false".equals(legacyParam) ? POSTGRES : LEGACY;
  }
}

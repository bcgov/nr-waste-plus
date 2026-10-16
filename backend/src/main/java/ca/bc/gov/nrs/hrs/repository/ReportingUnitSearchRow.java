package ca.bc.gov.nrs.hrs.repository;

import java.time.Instant;

/**
 * Scalar fields selected for one PostgreSQL reporting-unit search row (issue #1238, DEC-014).
 *
 * <p>Getter contract for the {@code Tuple} rows produced by the native query in {@link
 * ReportingUnitSearchQueryConstants} — the quoted SELECT aliases map 1:1 to these getters.
 * Mapped to the shared {@code ReportingUnitSearchResultDto} by the PostgreSQL search provider;
 * {@code id} and {@code bookmarked} stay service-level.
 */
public interface ReportingUnitSearchRow {

  /** The numeric reporting-unit identity (legacy {@code ru_number}). */
  Long getRuNumber();

  /** Surrogate block id; service-level row identity and paging tie-breaker input. */
  Long getBlockId();

  /** Always NULL on PostgreSQL rows (DEC-014 — no WAA concept). */
  Long getWasteAssessmentAreaId();

  /** Business cut-block id from the PRIMARY mark; NULL on RU-only rows. */
  String getCutBlockId();

  /** The reporting unit's client number. */
  String getClientCode();

  /** Always NULL from SQL; enriched by the service (Forest Client API, D5/legacy parity). */
  String getClientName();

  /** Forest file id from the PRIMARY mark; NULL on RU-only rows. */
  String getLicenseNumber();

  /** Trimmed/blank-to-null cutting permit from the PRIMARY mark (legacy output quirk). */
  String getCuttingPermit();

  /** Timber mark from the PRIMARY mark; NULL on RU-only rows. */
  String getTimberMark();

  /** No-source placeholder, always {@code false} (DEC-016). */
  Boolean getMultiMark();

  /** No-source placeholder, always {@code false} (DEC-016). */
  Boolean getSecondaryEntry();

  /** Fixed {@code AVG} sampling code (no sampling data in HRS search scope). */
  String getSamplingCode();

  /** Fixed {@code Average} sampling description. */
  String getSamplingName();

  /** District code ({@code org_unit_no}); description is NULL until D5 lookup. */
  String getDistrictCode();

  /** Always NULL from SQL; D5/legacy-lookup enrichment. */
  String getDistrictName();

  /** Latest RU {@code status_event} code; NULL when the RU has no events. */
  String getStatusCode();

  /** Always NULL from SQL until D5 (DEC-016). */
  String getStatusName();

  /** RU {@code updated_at} (timestamptz); the provider pins the LocalDateTime conversion. */
  Instant getLastUpdated();
}

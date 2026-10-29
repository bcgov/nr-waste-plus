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

  /**
   * The block id: the legacy WAA identity maps 1:1 to {@code wasteplus.block.block_id} (so this equals
   * {@link #getBlockId()} on block rows); NULL on RU-only rows where the block is null-extended.
   */
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

  /** District code ({@code geographic_code}); description is NULL until D5 lookup. */
  String getDistrictCode();

  /** Always NULL from SQL; D5/legacy-lookup enrichment. */
  String getDistrictName();

  /**
   * The block's status code: block-scoped latest {@code status_event} (long-form aliases
   * normalised) with the {@code DFT} fallback; NULL on RU-only rows (rendered "Not applicable").
   */
  String getStatusCode();

  /** The block's status description from {@code wasteplus.waa_status_code}; NULL on RU-only rows. */
  String getStatusName();

  /** RU {@code updated_at} (timestamptz); the provider pins the LocalDateTime conversion. */
  Instant getLastUpdated();
}

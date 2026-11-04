package ca.bc.gov.nrs.hrs.repository;

import java.math.BigDecimal;

/**
 * Scalar fields selected for one PostgreSQL reporting-unit EXPANDED row (issue #1238, expanded
 * search) — the projection of
 * {@link ReportingUnitSearchQueryConstants#SEARCH_REPORTING_UNIT_EXPANDED_QUERY}.
 *
 * <p>Getter contract for the {@code Tuple} row produced by the native query: the quoted SELECT
 * aliases map 1:1 to these getters. Field names mirror the legacy {@code
 * ReportingUnitSearchExpandedProjection} so the mapping to {@code ReportingUnitSearchExpandedDto}
 * reads identically; {@code netArea}/{@code markArea} arrive as {@code numeric} ({@link
 * BigDecimal}) and {@code secondary} as raw JSON text to be parsed by the provider.
 *
 * <p>No-source fields are NULL/{@code false} placeholders, never fabricated (see the {@code
 * v1-gap-register}): {@code markArea} ({@code null}), {@code exempted} ({@code false}), {@code
 * statusName} ({@code null}), and the per-mark {@code status}/{@code area} elements inside {@code
 * secondary}.
 */
public interface ReportingUnitSearchExpandedRow {

  /** Block id (the legacy WAA identity, 1:1 onto {@code wasteplus.block.block_id}). */
  Long getId();

  /** Forest file id from the block's PRIMARY mark; NULL when absent. */
  String getLicenseNo();

  /** Cutting permit from the block's PRIMARY mark; NULL when absent. */
  String getCuttingPermit();

  /** Timber mark from the block's PRIMARY mark; NULL when absent. */
  String getTimberMark();

  /** No-source placeholder, always {@code false} (legacy child-block/parent-WAA flag). */
  Boolean getExempted();

  /** Derived multiple-mark indicator: whether the block has a live {@code SECONDARY} mark. */
  Boolean getMultiMark();

  /** Sum of the block's live {@code block_area_segment.net_waste_area_ha}; {@code 0} when none. */
  BigDecimal getNetArea();

  /** No-source placeholder, always {@code null} (no HRS mark-area column). */
  BigDecimal getMarkArea();

  /** First live {@code block_submitter.submitter_name}; NULL when absent. */
  String getSubmitter();

  /** Latest finalized survey-map attachment id ({@code FINAL_MAP}/{@code FINALIZED}); NULL when
   *  absent. */
  Long getAttachmentId();

  /** Latest finalized survey-map attachment file name; NULL when absent. */
  String getAttachmentName();

  /** Latest live {@code block_comment.comment}; NULL when absent. */
  String getComments();

  /** Count of the reporting unit's live blocks. */
  Long getTotalBlockCount();

  /** Count of the block's live {@code SECONDARY} marks. */
  Long getTotalChildCount();

  /** The reporting unit's latest {@code status_event} code; NULL when the RU has no events. */
  String getStatusCode();

  /** No-source placeholder, always {@code null} (DEC-016 status description). */
  String getStatusName();

  /** JSON-array text of the block's live {@code SECONDARY} marks; {@code "[]"} when none. */
  String getSecondary();
}

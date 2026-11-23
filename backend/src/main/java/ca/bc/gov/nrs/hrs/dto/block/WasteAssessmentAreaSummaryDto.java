package ca.bc.gov.nrs.hrs.dto.block;

import java.math.BigDecimal;
import java.util.List;

/**
 * Precomputed waste assessment area summary for a block (primary + secondary marks only).
 *
 * @param primary primary mark row; may be null when no primary mark is found
 * @param secondary secondary mark rows; never null
 * @param totalNetWasteAreaHa backend-precomputed total net waste area in hectares
 */
public record WasteAssessmentAreaSummaryDto(
    WasteAssessmentAreaMarkDto primary,
    List<WasteAssessmentAreaMarkDto> secondary,
    BigDecimal totalNetWasteAreaHa) {

  /** Canonical constructor ensuring secondary is never null. */
  public WasteAssessmentAreaSummaryDto {
    secondary = secondary == null ? List.of() : List.copyOf(secondary);
  }
}

package ca.bc.gov.nrs.hrs.dto.block;

import java.time.LocalDate;
import java.util.List;

/**
 * Minimal block resource representation for downstream endpoint contracts.
 *
 * <p>Components:
 *
 * <ul>
 *   <li>{@code id}: the block identifier
 *   <li>{@code reportingUnitId}: the owning reporting-unit identifier
 *   <li>{@code blockType}: the block type; null when the source does not carry it
 *   <li>{@code draft}: whether the block is still a draft
 *   <li>{@code plcDate}: the PLC date; null when the source does not carry it
 *   <li>{@code revision}: the revision number; null when the source does not carry it
 *   <li>{@code isLegacy}: true when served from the legacy API, false when served from postgres
 *   <li>{@code secondaryTimberMarks}: secondary timber marks associated with the block
 *   <li>{@code roadPermitTimberMarks}: road permit timber marks associated with the block
 *   <li>{@code wasteAssessmentAreaSummary}: precomputed waste assessment area summary
 *   <li>{@code districtAverageVolumesSummary}: precomputed district average volumes summary
 * </ul>
 */
public record BlockDetailDto(
    Long id,
    Long reportingUnitId,
    String blockType,
    boolean draft,
    LocalDate plcDate,
    Long revision,
    boolean isLegacy,
    List<BlockMarkDto> secondaryTimberMarks,
    List<BlockMarkDto> roadPermitTimberMarks,
    WasteAssessmentAreaSummaryDto wasteAssessmentAreaSummary,
    DistrictAverageVolumesSummaryDto districtAverageVolumesSummary) {

  /** Canonical constructor ensuring mark lists are never null. */
  public BlockDetailDto {
    secondaryTimberMarks =
        secondaryTimberMarks == null ? List.of() : List.copyOf(secondaryTimberMarks);
    roadPermitTimberMarks =
        roadPermitTimberMarks == null ? List.of() : List.copyOf(roadPermitTimberMarks);
  }

  /** Backward-compatible constructor without timber mark payload or summaries. */
  public BlockDetailDto(
      Long id,
      Long reportingUnitId,
      String blockType,
      boolean draft,
      LocalDate plcDate,
      Long revision,
      boolean isLegacy) {
    this(
        id,
        reportingUnitId,
        blockType,
        draft,
        plcDate,
        revision,
        isLegacy,
        List.of(),
        List.of(),
        null,
        null);
  }

  /** Backward-compatible constructor without summaries. */
  public BlockDetailDto(
      Long id,
      Long reportingUnitId,
      String blockType,
      boolean draft,
      LocalDate plcDate,
      Long revision,
      boolean isLegacy,
      List<BlockMarkDto> secondaryTimberMarks,
      List<BlockMarkDto> roadPermitTimberMarks) {
    this(
        id,
        reportingUnitId,
        blockType,
        draft,
        plcDate,
        revision,
        isLegacy,
        secondaryTimberMarks,
        roadPermitTimberMarks,
        null,
        null);
  }

  /** Backward-compatible constructor without district average volumes summary. */
  public BlockDetailDto(
      Long id,
      Long reportingUnitId,
      String blockType,
      boolean draft,
      LocalDate plcDate,
      Long revision,
      boolean isLegacy,
      List<BlockMarkDto> secondaryTimberMarks,
      List<BlockMarkDto> roadPermitTimberMarks,
      WasteAssessmentAreaSummaryDto wasteAssessmentAreaSummary) {
    this(
        id,
        reportingUnitId,
        blockType,
        draft,
        plcDate,
        revision,
        isLegacy,
        secondaryTimberMarks,
        roadPermitTimberMarks,
        wasteAssessmentAreaSummary,
        null);
  }
}

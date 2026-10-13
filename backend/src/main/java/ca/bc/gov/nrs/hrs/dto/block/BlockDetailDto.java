package ca.bc.gov.nrs.hrs.dto.block;

import java.time.LocalDate;

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
 * </ul>
 */
public record BlockDetailDto(
    Long id,
    Long reportingUnitId,
    String blockType,
    boolean draft,
    LocalDate plcDate,
    Long revision,
    boolean isLegacy) {}

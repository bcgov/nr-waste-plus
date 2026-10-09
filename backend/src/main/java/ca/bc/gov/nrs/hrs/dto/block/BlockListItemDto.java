package ca.bc.gov.nrs.hrs.dto.block;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Row contract shared by the backend and legacy block-list endpoints.
 *
 * <p>Exactly eleven fields in fixed order. {@code status} is never null and always carries a code
 * and description; {@code cutBlockId} is never null and defaults to an empty string. {@code
 * blockType} is null for legacy (Oracle) rows, which carry no block type in their payload.
 *
 * @param id the block identifier
 * @param licenseNumber the forest file identifier from the primary mark
 * @param cuttingPermit the cutting permit identifier from the primary mark
 * @param cutBlockId the cut block identifier; never null, empty when unknown
 * @param timberMark the timber mark identifier from the primary mark
 * @param totalWasteAreaHa the summed waste area in hectares, null when unavailable
 * @param totalWasteVolumeM3 the estimated waste volume in cubic metres, null when unavailable
 * @param submitter the name of the submitter, null when unknown
 * @param status the block lifecycle status; never null
 * @param lastUpdated the last update timestamp of the block, null when unknown
 * @param blockType the block type (e.g. {@code DISTRICT_AVERAGE}), null for legacy rows
 */
public record BlockListItemDto(
    Long id,
    String licenseNumber,
    String cuttingPermit,
    String cutBlockId,
    String timberMark,
    BigDecimal totalWasteAreaHa,
    BigDecimal totalWasteVolumeM3,
    String submitter,
    Status status,
    LocalDateTime lastUpdated,
    String blockType) {

  /**
   * Block lifecycle status as a code and description pair.
   *
   * @param code the status code
   * @param description the human-readable status name
   */
  public record Status(String code, String description) {}
}

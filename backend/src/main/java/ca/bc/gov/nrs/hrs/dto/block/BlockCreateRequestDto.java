package ca.bc.gov.nrs.hrs.dto.block;

import jakarta.validation.constraints.NotNull;

/** Request payload for creating a block under a reporting unit. */
public record BlockCreateRequestDto(
    @NotNull(message = "Block type is required")
    BlockType blockType,
    String expectedReportingUnitState) {

  public BlockCreateRequestDto(BlockType blockType) {
    this(blockType, null);
  }
}

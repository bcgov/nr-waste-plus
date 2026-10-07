package ca.bc.gov.nrs.hrs.dto.reportingunit;

/**
 * Block-creation rule for a reporting unit's sampling type.
 *
 * @param maxBlocks the maximum number of blocks allowed for the sampling type
 * @param blockType the block type to create, e.g. {@code DISTRICT_AVERAGE}
 */
public record BlockRuleDto(int maxBlocks, String blockType) {}

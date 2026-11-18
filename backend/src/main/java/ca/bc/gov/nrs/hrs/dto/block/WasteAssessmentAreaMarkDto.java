package ca.bc.gov.nrs.hrs.dto.block;

import java.math.BigDecimal;

/**
 * Waste assessment area mark row used in block-details summary.
 *
 * @param timberMarkId user-visible timber mark identifier/value
 * @param netWasteAreaHa net waste area in hectares for this mark; null when no DB value exists
 */
public record WasteAssessmentAreaMarkDto(String timberMarkId, BigDecimal netWasteAreaHa) {}

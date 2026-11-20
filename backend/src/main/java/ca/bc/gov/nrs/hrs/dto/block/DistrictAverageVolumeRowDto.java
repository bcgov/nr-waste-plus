package ca.bc.gov.nrs.hrs.dto.block;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;

/**
 * District average volumes summary row for a block (read/load).
 *
 * @param populationType population/stratum type label from source data
 * @param wasteType waste type label from source data
 * @param harvestMethodCode harvest method code or display value from source data
 * @param assessmentMethod assessment method label from source data
 * @param wasteLevel waste level label from source data
 * @param netWasteAreaHa net waste area in hectares; null when unavailable
 * @param totalBillableVolumeM3 total billable volume in cubic metres; null when unavailable
 * @param totalCutControlVolumeM3 total cut control volume in cubic metres; null when unavailable
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DistrictAverageVolumeRowDto(
    String populationType,
    String wasteType,
    String harvestMethodCode,
    String assessmentMethod,
    String wasteLevel,
    BigDecimal netWasteAreaHa,
    BigDecimal totalBillableVolumeM3,
    BigDecimal totalCutControlVolumeM3) {}

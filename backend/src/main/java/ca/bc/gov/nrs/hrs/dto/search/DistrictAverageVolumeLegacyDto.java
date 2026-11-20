package ca.bc.gov.nrs.hrs.dto.search;

import java.math.BigDecimal;

/**
 * Legacy district average volume/stratum row for a waste assessment area block.
 *
 * @param populationType population/stratum type description
 * @param wasteType waste type description
 * @param harvestMethodCode harvest method code
 * @param harvestMethodDescription harvest method description
 * @param assessmentMethod assessment method description
 * @param wasteLevel waste level description
 * @param netWasteAreaHa net waste area in hectares for the stratum
 * @param totalEstimatedVolumeM3 total estimated volume in cubic metres (not split billable/cut)
 */
public record DistrictAverageVolumeLegacyDto(
    String populationType,
    String wasteType,
    String harvestMethodCode,
    String harvestMethodDescription,
    String assessmentMethod,
    String wasteLevel,
    BigDecimal netWasteAreaHa,
    BigDecimal totalEstimatedVolumeM3) {}

package ca.bc.gov.nrs.hrs.dto.block;

import java.math.BigDecimal;

/**
 * Backend-precomputed totals for district average volumes summary.
 *
 * @param totalBillableVolumeM3 total billable volume in cubic metres
 * @param totalCutControlVolumeM3 total cut control volume in cubic metres
 */
public record DistrictAverageVolumeTotalsDto(
    BigDecimal totalBillableVolumeM3, BigDecimal totalCutControlVolumeM3) {

  /** Canonical constructor defaulting null totals to zero. */
  public DistrictAverageVolumeTotalsDto {
    totalBillableVolumeM3 = totalBillableVolumeM3 == null ? BigDecimal.ZERO : totalBillableVolumeM3;
    totalCutControlVolumeM3 =
        totalCutControlVolumeM3 == null ? BigDecimal.ZERO : totalCutControlVolumeM3;
  }
}

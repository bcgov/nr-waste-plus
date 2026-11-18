package ca.bc.gov.nrs.hrs.dto.block;

import java.math.BigDecimal;
import java.util.List;

/**
 * Precomputed district average volumes summary for a block (read/load).
 *
 * @param rows volume summary rows; never null
 * @param totals backend-precomputed totals for billable and cut control volumes
 */
public record DistrictAverageVolumesSummaryDto(
    List<DistrictAverageVolumeRowDto> rows, DistrictAverageVolumeTotalsDto totals) {

  /** Canonical constructor ensuring rows and totals are never null. */
  public DistrictAverageVolumesSummaryDto {
    rows = rows == null ? List.of() : List.copyOf(rows);
    totals = totals == null ? new DistrictAverageVolumeTotalsDto(BigDecimal.ZERO, BigDecimal.ZERO) : totals;
  }

  /** Empty summary with zero totals. */
  public static DistrictAverageVolumesSummaryDto empty() {
    return new DistrictAverageVolumesSummaryDto(List.of(), new DistrictAverageVolumeTotalsDto(BigDecimal.ZERO, BigDecimal.ZERO));
  }
}

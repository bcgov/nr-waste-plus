package ca.bc.gov.nrs.hrs.dto.block;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Response DTO for the block calculation snapshot endpoint. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BlockCalculationDto(
    Long blockId,
    Long districtVolumeId,
    Instant calculatedAt,
    String roundingPolicy,
    Outputs outputs,
    List<BlockCalculationWarning> warnings) {

  /** Calculation outputs container. */
  public record Outputs(List<PerMark> perMark, BigDecimal grandTotalM3) {}

  /** Per-mark breakdown (populated when mark-level resolution is available). */
  public record PerMark(
      Integer markSequenceNo, List<Category> categories, BigDecimal totalM3) {}

  /** Individual category volume within a mark. */
  public record Category(String code, BigDecimal volumeM3) {}
}

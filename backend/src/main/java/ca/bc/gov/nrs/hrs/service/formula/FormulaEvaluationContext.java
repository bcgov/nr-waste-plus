package ca.bc.gov.nrs.hrs.service.formula;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

/**
 * Immutable context carrying pre-resolved variable values for formula evaluation.
 *
 * @param date submission effective date
 * @param area INTERIOR or COASTAL
 * @param district selected district code (e.g. "DCC")
 * @param blockId block identifier for submission data
 * @param districtVolumeId district volume configuration identifier
 * @param variables namespace-qualified variable values (e.g. "da.mature.total" → 11.530)
 */
public record FormulaEvaluationContext(
    LocalDate date,
    Area area,
    String district,
    Long blockId,
    Long districtVolumeId,
    Map<String, BigDecimal> variables) {}

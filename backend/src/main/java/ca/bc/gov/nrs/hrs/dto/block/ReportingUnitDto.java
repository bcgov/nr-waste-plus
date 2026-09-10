package ca.bc.gov.nrs.hrs.dto.block;

/** Reporting-unit persistence projection. */
public record ReportingUnitDto(Long id, String clientNumber, String clientLocnCode,
    String orgUnitNo, Long revision) {}

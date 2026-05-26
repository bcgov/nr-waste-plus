package ca.bc.gov.nrs.hrs.dto.reportingunit;

/**
 * Response DTO for a created reporting unit.
 *
 * <p>Returned after a successful create operation and contains the generated
 * identifier for the new reporting unit.
 *
 * @param id the database identifier of the newly created reporting unit
 */
public record CreateReportingUnitResponseDto(
    Long id
) {
}

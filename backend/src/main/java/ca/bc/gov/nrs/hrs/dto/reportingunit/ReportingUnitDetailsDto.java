package ca.bc.gov.nrs.hrs.dto.reportingunit;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;

/**
 * Data Transfer Object representing the full details of a Reporting Unit.
 *
 * <p>Aggregates information from both the legacy API and the Forest Client API,
 * presenting a unified view of a reporting unit's identity, client association,
 * status, sampling method, and district.
 * </p>
 *
 * <!-- TODO(grade-configuration): The {@code grade} field has been removed from this contract
 *      because no data source can populate it yet.  It will be reinstated — as a
 *      {@link CodeDescriptionDto} parameter — once the grade-configuration feature branch
 *      wires up the lookup table and the legacy mapping.  When that work lands:
 *        1. Re-add {@code CodeDescriptionDto grade} to this record.
 *        2. Restore the grade parameter in {@code ReportingUnitService#getReportingUnitDetails}.
 *        3. Add the corresponding {@code $.grade.code} / {@code $.grade.description} assertions
 *           to {@code ReportingUnitControllerIntegrationTest} and
 *           {@code ReportingUnitServiceTest}.
 * -->
 *
 * @param id           the unique identifier of the reporting unit
 * @param client       the client code and name associated with the reporting unit
 * @param clientStatus the current status code and description of the associated client
 * @param sampling     the sampling method code and description for the reporting unit
 * @param district     the natural resource district code and description
 */
public record ReportingUnitDetailsDto(
    Long id,
    CodeDescriptionDto client,
    CodeDescriptionDto clientStatus,
    CodeDescriptionDto sampling,
    CodeDescriptionDto district,
    CodeDescriptionDto grade
) {
}

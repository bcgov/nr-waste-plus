package ca.bc.gov.nrs.hrs.dto.reportingunit;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;

/**
 * Data Transfer Object representing the full details of a Reporting Unit.
 *
 * <p>Aggregates information from both the legacy API and the Forest Client API,
 * presenting a unified view of a reporting unit's identity, client association,
 * status, grade, sampling method, and district.
 * </p>
 *
 * @param id           the unique identifier of the reporting unit
 * @param client       the client code and name associated with the reporting unit
 * @param clientStatus the current status code and description of the associated client
 * @param grade        the grade code and description applied to the reporting unit
 * @param sampling     the sampling method code and description for the reporting unit
 * @param district     the natural resource district code and description
 */
public record ReportingUnitDetailsDto(
    Long id,
    CodeDescriptionDto client,
    CodeDescriptionDto clientStatus,
    CodeDescriptionDto grade,
    CodeDescriptionDto sampling,
    CodeDescriptionDto district
) {
}

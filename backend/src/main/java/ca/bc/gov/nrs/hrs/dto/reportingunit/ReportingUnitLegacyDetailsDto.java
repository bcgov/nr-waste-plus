package ca.bc.gov.nrs.hrs.dto.reportingunit;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;

/**
 * Data Transfer Object representing reporting unit details as returned by the legacy API.
 *
 * <p>Used as an intermediate representation when fetching details directly from the legacy
 * system, before the data is enriched with information from the Forest Client API.
 * </p>
 *
 * @param clientNumber   the client number associated with the reporting unit
 * @param clientLocnCode the client location code identifying the client's location record
 * @param sampling       the sampling method code and description used for the reporting unit
 * @param district       the natural resource district code and description
 */
public record ReportingUnitLegacyDetailsDto(
    String clientNumber,
    String clientLocnCode,
    CodeDescriptionDto sampling,
    CodeDescriptionDto district
) {

}

package ca.bc.gov.nrs.hrs.dto.reportingunit;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;

/**
 * Data-transfer object carrying the high-level details of a Reporting Unit.
 *
 * <p>Returned by the Reporting Unit Details endpoint and carries client identification,
 * sampling option and district information as {@link CodeDescriptionDto} values.</p>
 *
 * @param clientNumber  the client number that owns this reporting unit
 * @param clientLocnCode the client location code associated with this reporting unit
 * @param sampling      the sampling option for this reporting unit (code and description)
 * @param district      the managing district for this reporting unit (code and description)
 */
public record ReportingUnitDetailsDto(
    String clientNumber,
    String clientLocnCode,
    CodeDescriptionDto sampling,
    CodeDescriptionDto district
) {
}

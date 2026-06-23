package ca.bc.gov.nrs.hrs.dto.reportingunit;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload used to create a reporting unit.
 *
 * @param clientNumber the client number that owns the reporting unit
 * @param districtCode the district code associated with the reporting unit
 * @param samplingCode the waste sampling option code
 * @param gradeCode the optional grade code
 */
public record CreateReportingUnitRequestDto(
    @NotBlank String clientNumber,
    @NotBlank String districtCode,
    @NotBlank String samplingCode,
    String gradeCode
) {}

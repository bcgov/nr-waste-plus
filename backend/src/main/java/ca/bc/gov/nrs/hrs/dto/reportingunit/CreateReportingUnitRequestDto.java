package ca.bc.gov.nrs.hrs.dto.reportingunit;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for creating a reporting unit.
 *
 * <p>This record represents the data required to create a new reporting unit in the
 * system. Fields annotated with {@link jakarta.validation.constraints.NotBlank}
 * are required and must not be empty or null when validated.
 *
 * @param clientNumber the client number associated with the reporting unit (required)
 * @param districtCode the district code where the reporting unit is located (required)
 * @param samplingCode the sampling code for the reporting unit (required)
 * @param gradeCode optional grade code associated with the reporting unit
 */
public record CreateReportingUnitRequestDto(
    @NotBlank String clientNumber,
    @NotBlank String districtCode,
    @NotBlank String samplingCode,
    String gradeCode
) {}

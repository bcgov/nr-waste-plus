package ca.bc.gov.nrs.hrs.dto.reportingunit;

import jakarta.validation.constraints.NotBlank;

public record CreateReportingUnitRequestDto(
    @NotBlank String clientNumber,
    @NotBlank String districtCode,
    @NotBlank String samplingCode,
    String gradeCode
) {}

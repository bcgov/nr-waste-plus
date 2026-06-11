package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Represents a district volume record returned in district volume list results.
 *
 * @param id the unique identifier of the district volume record
 * @param area the geographic area associated with the record
 *        (for example, "INTERIOR" or "COASTAL")
 * @param startDate the date on which the district volume record becomes effective
 * @param endDate the date on which the district volume record ceases to be effective;
 *        may be {@code null} if the record is currently active
 * @param uploadedBy the username or identifier of the user who uploaded the record
 * @param dateOfUpload the timestamp when the record was uploaded
 */
public record DistrictVolumeListItemDto(
    @NotNull  Long id,
    @NotBlank String area,
    @NotNull  LocalDate startDate,
    LocalDate endDate,
    @NotBlank String uploadedBy,
    @NotNull  Instant dateOfUpload
) {}
package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Detailed representation of a District Volume configuration.
 *
 * <p>This DTO is used for full read operations and includes both metadata and
 * the complete polymorphic table structure.</p>
 *
 * <p>The {@code tableData} field is polymorphic and is serialized/deserialized
 * using a Jackson type discriminator (e.g. "type") to support multiple area-specific
 * layouts such as INTERIOR and COASTAL.</p>
 *
 * <p>The {@code heliMultiplier} field is only applicable for COASTAL configurations
 * and is excluded from JSON output when null.</p>
 */
public record DistrictVolumeDetailDto(
    Long id,
    String area,
    LocalDate startDate,
    LocalDate endDate,
    String uploadedBy,
    Instant dateOfUpload,
    BigDecimal tableLevelFactor,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    BigDecimal heliMultiplier, // COASTAL only; suppressed from JSON when null
    TableDataDto tableData
) {}
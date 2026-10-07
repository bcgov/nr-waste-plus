package ca.bc.gov.nrs.hrs.dto.reportingunit;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data-transfer object representing a single block row of a Reporting Unit.
 *
 * <p>Returned by the Reporting Unit Blocks endpoint as a plain JSON array. Nullable
 * fields are carried through as {@code null}; {@code cutBlockId} is never {@code null}
 * and defaults to an empty string.</p>
 *
 * @param id                the waste assessment area identifier of the block
 * @param licenseNumber     the forest file (licence) number, may be {@code null}
 * @param cuttingPermit     the cutting permit identifier, may be {@code null}
 * @param cutBlockId        the cut block identifier, never {@code null}
 * @param timberMark        the timber mark, may be {@code null}
 * @param totalWasteAreaHa  the total net waste area (ha), may be {@code null}
 * @param totalWasteVolumeM3 the total waste volume (m3), may be {@code null}
 * @param submitter         the submitter (sponsor) name, may be {@code null}
 * @param status            the block status (code and description), never {@code null}
 * @param lastUpdated       the last update timestamp, may be {@code null}
 */
public record ReportingUnitBlockDto(
    Long id,
    String licenseNumber,
    String cuttingPermit,
    String cutBlockId,
    String timberMark,
    BigDecimal totalWasteAreaHa,
    BigDecimal totalWasteVolumeM3,
    String submitter,
    CodeDescriptionDto status,
    LocalDateTime lastUpdated
) {
}

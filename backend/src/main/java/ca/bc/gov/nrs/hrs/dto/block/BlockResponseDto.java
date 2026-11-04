package ca.bc.gov.nrs.hrs.dto.block;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Representation of a block resource returned upon creation and item lookup.
 *
 * <p>{@code blockType} is null when {@code isLegacy} is true: the legacy (Oracle) block payload
 * carries no block subtype, so the envelope reports the subtype as unknown. Postgres-backed
 * blocks always carry a concrete {@code blockType}.
 *
 * @param id the block identifier
 * @param reportingUnitId the owning reporting unit
 * @param blockType the block subtype (e.g. {@code DISTRICT_AVERAGE}); null for legacy blocks
 * @param state the lifecycle state (e.g. {@code DRAFT}); derived from status for legacy blocks
 * @param draft whether the block is a draft
 * @param plcDate the planned completion date, null when unavailable
 * @param version the optimistic-lock version, null for legacy blocks
 * @param revision the revision backing the ETag header, null for legacy blocks
 * @param isLegacy true when the block is served from the legacy (Oracle) system
 * @param createdAt the creation timestamp, null for legacy blocks
 * @param updatedAt the last update timestamp, null for legacy blocks
 */
public record BlockResponseDto(
    Long id,
    Long reportingUnitId,
    String blockType,
    String state,
    boolean draft,
    LocalDate plcDate,
    Long version,
    Long revision,
    boolean isLegacy,
    Instant createdAt,
    Instant updatedAt) {}

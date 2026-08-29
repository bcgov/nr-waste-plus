package ca.bc.gov.nrs.hrs.dto.block;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.LocalDate;

/** Persistence-focused calculation snapshot representation. */
public record BlockCalculationSnapshotDto(Long id, Long blockId, Long districtVolumeId,
    LocalDate hbsWindowStart, LocalDate hbsWindowEnd, JsonNode inputs, JsonNode outputs,
    Instant calculatedAt, String roundingPolicy, JsonNode warnings) {}

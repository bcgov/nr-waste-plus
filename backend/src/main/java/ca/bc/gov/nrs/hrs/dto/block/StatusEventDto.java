package ca.bc.gov.nrs.hrs.dto.block;

import com.fasterxml.jackson.databind.JsonNode;

/** Status-event persistence projection. */
public record StatusEventDto(Long id, Long reportingUnitId, Long blockId, String status,
    String eventType, JsonNode details) {}

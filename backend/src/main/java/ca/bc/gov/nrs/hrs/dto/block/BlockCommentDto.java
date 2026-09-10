package ca.bc.gov.nrs.hrs.dto.block;

/** Block-comment persistence projection. */
public record BlockCommentDto(Long id, Long blockId, String context, String comment,
    Long statusEventId) {}

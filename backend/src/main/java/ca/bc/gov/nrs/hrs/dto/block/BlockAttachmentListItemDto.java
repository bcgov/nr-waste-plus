package ca.bc.gov.nrs.hrs.dto.block;

import java.time.Instant;

/** Summary item representing a single block attachment in a list response. */
public record BlockAttachmentListItemDto(
    Long attachmentId,
    String documentType,
    String fileName,
    String contentType,
    Long fileSizeBytes,
    String status,
    String scanStatus,
    boolean valid,
    String linkedRequirementCode,
    String uploadedBy,
    Instant uploadedAt) {}

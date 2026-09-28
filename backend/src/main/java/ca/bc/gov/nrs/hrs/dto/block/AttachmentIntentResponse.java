package ca.bc.gov.nrs.hrs.dto.block;

import java.time.Instant;

/** Response returned by the attachment intent endpoint. */
public record AttachmentIntentResponse(
    Long attachmentId,
    String objectKey,
    String uploadUrl,
    Instant expiresAt) {}

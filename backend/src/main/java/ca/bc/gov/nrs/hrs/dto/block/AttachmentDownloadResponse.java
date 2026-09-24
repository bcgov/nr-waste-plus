package ca.bc.gov.nrs.hrs.dto.block;

import java.time.Instant;

/** Response returned by the attachment download URL endpoint. */
public record AttachmentDownloadResponse(
    Long attachmentId,
    String fileName,
    String contentType,
    long fileSizeBytes,
    String downloadUrl,
    Instant expiresAt) {}


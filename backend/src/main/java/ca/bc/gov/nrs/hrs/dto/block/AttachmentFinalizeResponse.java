package ca.bc.gov.nrs.hrs.dto.block;

/** Response returned by the attachment finalize endpoint. */
public record AttachmentFinalizeResponse(
    Long attachmentId, String objectKey, String status, String checksum) {}
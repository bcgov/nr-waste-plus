package ca.bc.gov.nrs.hrs.dto.block;

/** Block-attachment persistence projection. */
public record BlockAttachmentDto(Long id, Long blockId, String objectKey, String fileName,
    String contentType, Long fileSizeBytes, String scanStatus) {}

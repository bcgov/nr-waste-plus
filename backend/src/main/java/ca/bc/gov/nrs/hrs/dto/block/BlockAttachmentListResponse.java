package ca.bc.gov.nrs.hrs.dto.block;

import java.util.List;

/** Response returned by the block attachments list endpoint. */
public record BlockAttachmentListResponse(List<BlockAttachmentListItemDto> attachments) {}

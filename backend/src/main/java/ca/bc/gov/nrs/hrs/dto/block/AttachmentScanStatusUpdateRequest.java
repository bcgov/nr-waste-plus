package ca.bc.gov.nrs.hrs.dto.block;

import jakarta.validation.constraints.NotNull;

/** Request payload for updating the scan status of an attachment. */
public record AttachmentScanStatusUpdateRequest(
    @NotNull(message = "scanStatus is required") AttachmentScanStatus scanStatus) {}


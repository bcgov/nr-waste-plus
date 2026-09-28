package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatusUpdateRequest;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.service.block.AttachmentScanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal endpoints for administrative or asynchronous scanner callback operations.
 */
@RestController
@RequestMapping("/api/internal/attachments")
@RequiredArgsConstructor
public class InternalAttachmentController {

  private final AttachmentScanService scanService;

  /**
   * Updates the scan status of an attachment.
   *
   * <p>Restricted to administrative callers and automated scanner service accounts.
   *
   * @param attachmentId the attachment identifier
   * @param request the scan status update request
   * @return {@code 200 OK} with the updated scan status
   */
  @PatchMapping("/{attachmentId}/scan-status")
  public ResponseEntity<AttachmentScanResponse> updateScanStatus(
      @PathVariable Long attachmentId,
      @Valid @RequestBody AttachmentScanStatusUpdateRequest request) {
    BlockAttachmentEntity updated =
        scanService.updateScanStatus(attachmentId, request.scanStatus());
    return ResponseEntity.ok(
        new AttachmentScanResponse(updated.getId(), updated.getScanStatus()));
  }
}


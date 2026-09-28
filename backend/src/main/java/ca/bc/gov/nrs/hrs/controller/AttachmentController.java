package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentDownloadResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentFinalizeResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentRequest;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentResponse;
import ca.bc.gov.nrs.hrs.service.block.AttachmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for the attachment upload lifecycle
 * (attempt / presigned PUT / finalize / download).
 */
@RestController
@RequestMapping("/api/reporting-units/{reportingUnitId}/{blockId}/attachments")
@RequiredArgsConstructor
public class AttachmentController {

  private final AttachmentService attachmentService;

  /**
   * Registers an upload attempt and returns a short-lived presigned PUT URL.
   *
   * @param jwt the JWT principal for the authenticated caller
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @param request the document metadata supplied by the client
   * @return {@code 201 Created} with the attachment id, object key and presigned upload URL
   */
  @PostMapping("/attempt")
  public ResponseEntity<AttachmentIntentResponse> createAttempt(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long reportingUnitId,
      @PathVariable Long blockId,
      @Valid @RequestBody AttachmentIntentRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(attachmentService.createAttempt(jwt, reportingUnitId, blockId, request));
  }

  /**
   * Finalizes a previously registered upload intent after the client has completed the direct PUT.
   *
   * @param jwt the JWT principal for the authenticated caller
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @param attachmentId the intent to finalize
   * @return {@code 200 OK} with the finalized attachment metadata
   */
  @PostMapping("/{attachmentId}/finalize")
  public ResponseEntity<AttachmentFinalizeResponse> finalizeAttachment(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long reportingUnitId,
      @PathVariable Long blockId,
      @PathVariable Long attachmentId) {
    return ResponseEntity.ok(
        attachmentService.finalizeAttachment(jwt, reportingUnitId, blockId, attachmentId));
  }

  /**
   * Retrieves a short-lived presigned download URL for a finalized, clean attachment.
   *
   * <p>Enforces quarantine gating: requests for quarantined, unfinalized, or unverified
   * attachments are rejected.
   *
   * @param jwt the JWT principal for the authenticated caller
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @param attachmentId the attachment identifier
   * @return {@code 200 OK} with the presigned download URL and metadata
   */
  @GetMapping("/{attachmentId}/download")
  public ResponseEntity<AttachmentDownloadResponse> getDownloadUrl(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long reportingUnitId,
      @PathVariable Long blockId,
      @PathVariable Long attachmentId) {
    return ResponseEntity.ok(
        attachmentService.getDownloadUrl(jwt, reportingUnitId, blockId, attachmentId));
  }
}

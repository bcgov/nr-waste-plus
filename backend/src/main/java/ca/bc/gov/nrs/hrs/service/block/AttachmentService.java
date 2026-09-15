package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.configuration.ObjectStorageProperties;
import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentDocumentType;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentFinalizeResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentRequest;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageObjectNotFoundException;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageProvider;
import ca.bc.gov.nrs.hrs.provider.objectstorage.StoredObjectSummary;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Manages the private object-storage attachment lifecycle: intent registration, presigned PUT
 * issuance, and finalize/integrity verification.
 *
 * <p>Upload bytes never traverse the backend; the server only mints short-lived presigned URLs and
 * inspects object metadata afterwards to confirm what was stored.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Observed
public class AttachmentService {

  private static final String SCAN_STATUS_PENDING = "PENDING";
  private static final String OBJECT_KEY_PREFIX = "hrs/block/";

  private final BlockAttachmentRepository attachmentRepository;
  private final BlockRepository blockRepository;
  private final ReportingUnitRepository reportingUnitRepository;
  private final ObjectStorageProvider objectStorage;
  private final ObjectStorageProperties objectStorageProperties;

  /**
   * Registers an intent to upload an attachment and returns a short-lived presigned PUT URL.
   *
   * <p>The attached row is persisted immediately with {@code status = UPLOADING} so the returned
   * object key and attachment id are stable for the duration of the upload.
   *
   * @param jwt the JWT principal for the authenticated caller, if available
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @param request document metadata provided by the client
   * @return the attachment id, server-generated object key, presigned URL and its expiry
   */
  @NewSpan
  @Transactional
  public AttachmentIntentResponse createIntent(
      Jwt jwt, Long reportingUnitId, Long blockId, AttachmentIntentRequest request) {

    long maxSize = objectStorageProperties.getMaxAttachmentSizeBytes();
    if (request.declaredSizeBytes() > maxSize) {
      throw new ResponseStatusException(
          HttpStatus.PAYLOAD_TOO_LARGE,
          String.format(
              "Declared size %d bytes exceeds the maximum allowed size of %d bytes",
              request.declaredSizeBytes(), maxSize));
    }

    final AttachmentDocumentType documentType =
        AttachmentDocumentType.from(request.documentType())
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid documentType: " + request.documentType()));

    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        String.format("Reporting unit %d not found", reportingUnitId)));

    validateClientAccess(jwt, reportingUnit);

    blockRepository
        .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    String.format(
                        "Block %d not found for reporting unit %d", blockId, reportingUnitId)));

    String sanitizedFileName = sanitizeFileName(request.fileName());
    BlockAttachmentEntity entity = new BlockAttachmentEntity();
    entity.setBlockId(blockId);
    entity.setObjectKey(placeholderKey(blockId));
    entity.setFileName(sanitizedFileName);
    entity.setContentType(request.mimeType());
    entity.setFileSizeBytes(request.declaredSizeBytes());
    entity.setScanStatus(SCAN_STATUS_PENDING);
    entity.setStatus(AttachmentStatus.UPLOADING.name());
    entity.setDocumentType(documentType.name());

    BlockAttachmentEntity saved = attachmentRepository.saveAndFlush(entity);

    String objectKey = buildObjectKey(blockId, saved.getId(), sanitizedFileName);
    saved.setObjectKey(objectKey);
    attachmentRepository.save(saved);

    var upload =
        objectStorage.presignPut(
            objectKey, request.mimeType(), objectStorageProperties.getPresignedUrlDuration());

    log.info(
        "Attachment intent created: id={}, blockId={}, objectKey={}, expiresAt={}",
        saved.getId(),
        blockId,
        objectKey,
        upload.expiresAt());

    return new AttachmentIntentResponse(
        saved.getId(), objectKey, upload.uploadUrl(), upload.expiresAt());
  }

  /**
   * Overload for {@link #createIntent(Jwt, Long, Long, AttachmentIntentRequest)} without a JWT.
   *
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @param request document metadata provided by the client
   * @return the attachment intent response
   */
  public AttachmentIntentResponse createIntent(
      Long reportingUnitId, Long blockId, AttachmentIntentRequest request) {
    return createIntent(null, reportingUnitId, blockId, request);
  }

  /**
   * Finalizes a previously registered upload intent.
   *
   * <p>Performs a HEAD request against the object store, verifies size against the value declared
   * at intent time, captures the object store checksum (ETag), and transitions {@code status} from
   * {@code UPLOADING} to {@code FINALIZED}. On subsequent retries, verifies the checksum has not
   * changed.
   *
   * @param jwt the JWT principal for the authenticated caller, if available
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @param attachmentId the attachment intent to finalize
   * @return the finalized attachment state including the captured checksum
   */
  @NewSpan
  @Transactional
  public AttachmentFinalizeResponse finalizeAttachment(
      Jwt jwt, Long reportingUnitId, Long blockId, Long attachmentId) {

    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        String.format("Reporting unit %d not found", reportingUnitId)));

    validateClientAccess(jwt, reportingUnit);

    blockRepository
        .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    String.format(
                        "Block %d not found for reporting unit %d", blockId, reportingUnitId)));

    BlockAttachmentEntity attachment =
        attachmentRepository
            .findByIdAndDeletedFalse(attachmentId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Attachment intent not found: " + attachmentId));

    if (!attachment.getBlockId().equals(blockId)) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          String.format(
              "Attachment %d does not belong to block %d", attachmentId, blockId));
    }

    StoredObjectSummary stored;
    try {
      stored = objectStorage.headObject(attachment.getObjectKey());
    } catch (ObjectStorageObjectNotFoundException e) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Uploaded object missing for attachment " + attachmentId);
    }

    long maxSize = objectStorageProperties.getMaxAttachmentSizeBytes();
    if (stored.sizeBytes() > maxSize) {
      throw new ResponseStatusException(
          HttpStatus.PAYLOAD_TOO_LARGE,
          String.format(
              "Stored object size %d bytes exceeds the maximum allowed size of %d bytes",
              stored.sizeBytes(), maxSize));
    }

    if (attachment.getFileSizeBytes() != null
        && stored.sizeBytes() != attachment.getFileSizeBytes()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          String.format(
              "Size mismatch: expected %d bytes, actual %d bytes",
              attachment.getFileSizeBytes(), stored.sizeBytes()));
    }

    // Checksum is captured on initial finalize; verify it has not drifted on idempotent retries.
    if (StringUtils.isNotBlank(attachment.getChecksum())
        && !attachment.getChecksum().equals(stored.checksum())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          String.format(
              "Checksum mismatch: expected %s, actual %s",
              attachment.getChecksum(), stored.checksum()));
    }

    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setChecksum(stored.checksum());
    attachmentRepository.save(attachment);

    log.info(
        "Attachment finalized: id={}, status={}, checksum={}",
        attachmentId,
        attachment.getStatus(),
        attachment.getChecksum());

    return new AttachmentFinalizeResponse(
        attachmentId,
        attachment.getObjectKey(),
        attachment.getStatus(),
        attachment.getChecksum());
  }

  /**
   * Overload for {@link #finalizeAttachment(Jwt, Long, Long, Long)} without a JWT.
   *
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @param attachmentId the attachment intent to finalize
   * @return the finalized attachment state
   */
  public AttachmentFinalizeResponse finalizeAttachment(
      Long reportingUnitId, Long blockId, Long attachmentId) {
    return finalizeAttachment(null, reportingUnitId, blockId, attachmentId);
  }

  /**
   * Sanitizes a client-supplied file name into a safe object-key suffix.
   *
   * <p>Path components are stripped, non-alphanumeric characters (except {@code . - _}) are
   * replaced with underscores, and the total length is truncated to preserve a trailing extension
   * when possible.
   *
   * @param fileName the raw file name supplied by the client
   * @return a safe, portable file name suitable for use in an object key
   */
  static String sanitizeFileName(String fileName) {
    if (StringUtils.isBlank(fileName)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fileName must not be blank");
    }
    String normalized = fileName.trim().replace('\\', '/');
    int lastSeparator = normalized.lastIndexOf('/');
    String basename = lastSeparator >= 0 ? normalized.substring(lastSeparator + 1) : normalized;
    String cleaned =
        basename
            .replaceAll("[^A-Za-z0-9._-]", "_")
            .replaceAll("_+", "_")
            .replaceAll("^[._]+", "");
    if (StringUtils.isBlank(cleaned)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "fileName does not contain a usable name");
    }
    int dot = cleaned.lastIndexOf('.');
    String stem = dot > 0 ? cleaned.substring(0, dot) : cleaned;
    String ext = dot > 0 ? cleaned.substring(dot + 1) : "";
    if (stem.length() > 150) {
      stem = stem.substring(0, 150);
    }
    if (ext.length() > 20) {
      ext = ext.substring(0, 20);
    }
    return ext.isEmpty() ? stem : stem + "." + ext;
  }

  private static String placeholderKey(long blockId) {
    return OBJECT_KEY_PREFIX + blockId + "/attachment/pending";
  }

  private static String buildObjectKey(long blockId, Long attachmentId, String sanitizedFileName) {
    return OBJECT_KEY_PREFIX
        + blockId
        + "/attachment/"
        + attachmentId
        + "/"
        + sanitizedFileName;
  }

  private void validateClientAccess(Jwt jwt, ReportingUnitEntity reportingUnit) {
    if (jwt == null) {
      return;
    }
    IdentityProvider idp =
        IdentityProvider.fromClaim(JwtPrincipalUtil.getProvider(jwt)).orElse(null);
    if (IdentityProvider.BUSINESS_BCEID == idp) {
      List<String> userClientNumbers = JwtPrincipalUtil.getClientFromRoles(jwt);
      if (!userClientNumbers.contains(reportingUnit.getClientNumber())) {
        log.warn(
            "SECURITY: BCeID user {} attempted unauthorized access to reporting unit {}",
            JwtPrincipalUtil.getUserId(jwt),
            reportingUnit.getId());
        throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "User is not authorized to access reporting unit: " + reportingUnit.getId());
      }
    }
  }
}

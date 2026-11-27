package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.configuration.ObjectStorageProperties;
import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentDocumentType;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentDownloadResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentFinalizeResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentRequest;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.dto.block.BlockAttachmentListItemDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockAttachmentListResponse;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockRequirementEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.exception.AttachmentConflictException;
import ca.bc.gov.nrs.hrs.exception.AttachmentNotFoundException;
import ca.bc.gov.nrs.hrs.exception.AttachmentSizeExceededException;
import ca.bc.gov.nrs.hrs.exception.BlockNotFoundException;
import ca.bc.gov.nrs.hrs.exception.InvalidDocumentTypeException;
import ca.bc.gov.nrs.hrs.exception.InvalidFileNameException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageObjectNotFoundException;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStoragePreconditionFailedException;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageProvider;
import ca.bc.gov.nrs.hrs.provider.objectstorage.StoredObjectSummary;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRequirementRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import ca.bc.gov.nrs.hrs.service.lifecycle.TransitionEvaluationResult;
import ca.bc.gov.nrs.hrs.service.lifecycle.TransitionPolicyService;
import ca.bc.gov.nrs.hrs.util.ConditionalRequestSupport;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
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

  private static final String STAGING_KEY_PREFIX = "hrs/staging/block/";
  private static final String PERMANENT_KEY_PREFIX = "hrs/block/";

  private final BlockAttachmentRepository attachmentRepository;
  private final BlockRepository blockRepository;
  private final ReportingUnitRepository reportingUnitRepository;
  private final ObjectStorageProvider objectStorage;
  private final ObjectStorageProperties objectStorageProperties;
  private final AttachmentScanService scanService;
  private final StatusEventRepository statusEventRepository;
  private final BlockRequirementRepository blockRequirementRepository;
  private final TransitionPolicyService transitionPolicyService;

  /**
   * Registers an attempt to upload an attachment and returns a short-lived presigned PUT URL.
   * Alias for {@link #createIntent(Jwt, Long, Long, AttachmentIntentRequest)}.
   *
   * @param jwt the JWT principal for the authenticated caller, if available
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @param request document metadata provided by the client
   * @return the attachment id, server-generated object key, presigned URL and its expiry
   */
  @NewSpan
  @Transactional
  public AttachmentIntentResponse createAttempt(
      Jwt jwt, Long reportingUnitId, Long blockId, AttachmentIntentRequest request) {
    return createIntent(jwt, reportingUnitId, blockId, request);
  }

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
      throw new AttachmentSizeExceededException(request.declaredSizeBytes(), maxSize);
    }

    final AttachmentDocumentType documentType =
        AttachmentDocumentType.from(request.documentType())
            .orElseThrow(() -> new InvalidDocumentTypeException(request.documentType()));

    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateClientAccess(jwt, reportingUnit);

    blockRepository
        .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
        .orElseThrow(() -> new BlockNotFoundException(blockId, reportingUnitId));

    String sanitizedFileName = sanitizeFileName(request.fileName());
    BlockAttachmentEntity entity = new BlockAttachmentEntity();
    entity.setBlockId(blockId);
    entity.setObjectKey(placeholderKey(blockId));
    entity.setFileName(sanitizedFileName);
    entity.setContentType(request.mimeType());
    entity.setFileSizeBytes(request.declaredSizeBytes());
    entity.setScanStatus(AttachmentScanStatus.PENDING.name());
    entity.setStatus(AttachmentStatus.UPLOADING.name());
    entity.setDocumentType(documentType.name());

    BlockAttachmentEntity saved = attachmentRepository.saveAndFlush(entity);

    String stagingKey = buildStagingObjectKey(blockId, saved.getId(), sanitizedFileName);
    saved.setObjectKey(stagingKey);
    attachmentRepository.save(saved);

    var upload =
        objectStorage.presignPut(
            stagingKey, request.mimeType(), objectStorageProperties.getPresignedUrlDuration());

    log.info(
        "Attachment intent created: id={}, blockId={}, stagingKey={}, expiresAt={}",
        saved.getId(),
        blockId,
        stagingKey,
        upload.expiresAt());

    return new AttachmentIntentResponse(
        saved.getId(), stagingKey, upload.uploadUrl(), upload.expiresAt());
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
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateClientAccess(jwt, reportingUnit);

    blockRepository
        .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
        .orElseThrow(() -> new BlockNotFoundException(blockId, reportingUnitId));

    BlockAttachmentEntity attachment =
        attachmentRepository
            .findByIdAndDeletedFalse(attachmentId)
            .orElseThrow(() -> new AttachmentNotFoundException(attachmentId));

    if (!attachment.getBlockId().equals(blockId)) {
      throw new AttachmentNotFoundException(attachmentId, blockId);
    }

    String permanentKey =
        buildPermanentObjectKey(blockId, attachmentId, attachment.getFileName());

    // 1. Idempotent check: if already finalized, verify checksum against permanent key.
    if (AttachmentStatus.FINALIZED.name().equals(attachment.getStatus())) {
      StoredObjectSummary stored;
      try {
        stored = objectStorage.headObject(attachment.getObjectKey());
      } catch (ObjectStorageObjectNotFoundException e) {
        throw AttachmentConflictException.missingObject(attachmentId);
      }
      if (StringUtils.isNotBlank(attachment.getChecksum())
          && !attachment.getChecksum().equals(stored.checksum())) {
        throw AttachmentConflictException.checksumMismatch(
            attachment.getChecksum(), stored.checksum());
      }
      return new AttachmentFinalizeResponse(
          attachmentId,
          attachment.getObjectKey(),
          attachment.getStatus(),
          attachment.getChecksum());
    }

    // 2. Fetch staging metadata with concurrency fallback
    String stagingKey = attachment.getObjectKey();
    StoredObjectSummary stored;
    try {
      stored = objectStorage.headObject(stagingKey);
    } catch (ObjectStorageObjectNotFoundException e) {
      // Concurrency fallback: check if a racing request already promoted to permanent key
      try {
        StoredObjectSummary permStored = objectStorage.headObject(permanentKey);
        BlockAttachmentEntity reloaded =
            attachmentRepository.findByIdAndDeletedFalse(attachmentId).orElse(attachment);
        if (AttachmentStatus.FINALIZED.name().equals(reloaded.getStatus())
            && StringUtils.isNotBlank(reloaded.getChecksum())
            && reloaded.getChecksum().equals(permStored.checksum())) {
          return new AttachmentFinalizeResponse(
              attachmentId,
              reloaded.getObjectKey(),
              reloaded.getStatus(),
              reloaded.getChecksum());
        }
      } catch (Exception ignored) {
        // Fall through to throw original missingObject
      }
      throw AttachmentConflictException.missingObject(attachmentId);
    }

    long maxSize = objectStorageProperties.getMaxAttachmentSizeBytes();
    if (stored.sizeBytes() > maxSize) {
      throw AttachmentSizeExceededException.forStoredSize(stored.sizeBytes(), maxSize);
    }

    if (attachment.getFileSizeBytes() != null
        && stored.sizeBytes() != attachment.getFileSizeBytes()) {
      throw AttachmentConflictException.sizeMismatch(
          attachment.getFileSizeBytes(), stored.sizeBytes());
    }

    if (StringUtils.isNotBlank(attachment.getChecksum())
        && !attachment.getChecksum().equals(stored.checksum())) {
      throw AttachmentConflictException.checksumMismatch(
          attachment.getChecksum(), stored.checksum());
    }

    // 3. Promote object from staging key to immutable permanent key
    String confirmedChecksum;
    try {
      confirmedChecksum = objectStorage.copyObject(stagingKey, permanentKey, stored.checksum());
    } catch (ObjectStoragePreconditionFailedException e) {
      throw AttachmentConflictException.sourceModified(attachmentId);
    }

    // 4. Update and persist entity
    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setObjectKey(permanentKey);
    attachment.setChecksum(
        StringUtils.isNotBlank(confirmedChecksum) ? confirmedChecksum : stored.checksum());
    attachmentRepository.saveAndFlush(attachment);

    // 5. Delete staging object post-commit (leaves staging intact if DB fails)
    deleteStagingPostCommit(stagingKey);

    log.info(
        "Attachment finalized: id={}, status={}, checksum={}, permanentKey={}",
        attachmentId,
        attachment.getStatus(),
        attachment.getChecksum(),
        permanentKey);

    // 6. Trigger scan hook on permanent object
    scanService.scan(attachmentId);

    return new AttachmentFinalizeResponse(
        attachmentId,
        permanentKey,
        attachment.getStatus(),
        attachment.getChecksum());
  }

  /**
   * Generates a short-lived presigned GET URL to download a finalized and clean attachment.
   *
   * <p>Enforces quarantine gating: rejects unfinalized, quarantined, pending, or failed
   * attachments.
   *
   * @param jwt the JWT principal for the authenticated caller, if available
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @param attachmentId the attachment identifier to download
   * @return download metadata including presigned GET URL and expiry
   */
  @NewSpan
  @Transactional(readOnly = true)
  public AttachmentDownloadResponse getDownloadUrl(
      Jwt jwt, Long reportingUnitId, Long blockId, Long attachmentId) {

    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateClientAccess(jwt, reportingUnit);

    blockRepository
        .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
        .orElseThrow(() -> new BlockNotFoundException(blockId, reportingUnitId));

    BlockAttachmentEntity attachment =
        attachmentRepository
            .findByIdAndDeletedFalse(attachmentId)
            .orElseThrow(() -> new AttachmentNotFoundException(attachmentId));

    if (!attachment.getBlockId().equals(blockId)) {
      throw new AttachmentNotFoundException(attachmentId, blockId);
    }

    if (!AttachmentStatus.FINALIZED.name().equals(attachment.getStatus())) {
      throw AttachmentConflictException.attachmentNotFinalized(attachmentId);
    }

    AttachmentScanStatus scanStatus = AttachmentScanStatus.fromDb(attachment.getScanStatus());
    if (scanStatus == AttachmentScanStatus.QUARANTINED) {
      throw AttachmentConflictException.quarantined(attachmentId);
    }
    if (scanStatus == AttachmentScanStatus.PENDING) {
      throw AttachmentConflictException.scanPending(attachmentId);
    }
    if (scanStatus == AttachmentScanStatus.FAILED) {
      throw AttachmentConflictException.scanFailed(attachmentId);
    }

    var download =
        objectStorage.presignGet(
            attachment.getObjectKey(), objectStorageProperties.getPresignedUrlDuration());

    return new AttachmentDownloadResponse(
        attachment.getId(),
        attachment.getFileName(),
        attachment.getContentType(),
        attachment.getFileSizeBytes(),
        download.downloadUrl(),
        download.expiresAt());
  }

  /**
   * Lists all non-deleted, non-uploading attachments for a submission block, ordered by upload
   * timestamp ascending.
   *
   * @param jwt the JWT principal for the authenticated caller, if available
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @return the list of block attachments with server-computed validity
   */
  @NewSpan
  @Transactional(readOnly = true)
  public BlockAttachmentListResponse list(Jwt jwt, Long reportingUnitId, Long blockId) {
    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateClientAccess(jwt, reportingUnit);

    blockRepository
        .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
        .orElseThrow(() -> new BlockNotFoundException(blockId, reportingUnitId));

    List<BlockAttachmentEntity> attachments =
        attachmentRepository.findByBlockIdAndStatusNotAndDeletedFalseOrderByCreatedAtAsc(
            blockId, AttachmentStatus.UPLOADING.name());

    Map<Long, String> linkedRequirements =
        blockRequirementRepository.findByBlockIdAndDeletedFalse(blockId).stream()
            .filter(req -> req.getLinkedAttachmentId() != null)
            .collect(
                Collectors.toMap(
                    BlockRequirementEntity::getLinkedAttachmentId,
                    BlockRequirementEntity::getRequirementCode,
                    (first, second) -> first));

    List<BlockAttachmentListItemDto> items =
        attachments.stream()
            .map(
                entity ->
                    new BlockAttachmentListItemDto(
                        entity.getId(),
                        entity.getDocumentType(),
                        entity.getFileName(),
                        entity.getContentType(),
                        entity.getFileSizeBytes(),
                        entity.getStatus(),
                        entity.getScanStatus(),
                        isAttachmentValid(entity),
                        linkedRequirements.get(entity.getId()),
                        entity.getCreatedBy(),
                        entity.getCreatedAt()))
            .toList();

    return new BlockAttachmentListResponse(items);
  }

  /**
   * Returns the current optimistic-locking revision of the specified block, or {@code null} if
   * not found.
   *
   * @param reportingUnitId the owning reporting unit
   * @param blockId the submission block identifier
   * @return the block revision, or {@code null}
   */
  @Transactional(readOnly = true)
  public Long getBlockRevision(Long reportingUnitId, Long blockId) {
    return blockRepository
        .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
        .map(BlockEntity::getRevision)
        .orElse(null);
  }

  /**
   * Soft-deletes an attachment belonging to a block when the policy engine permits editing in the
   * block's current state for the caller's role and the {@code If-Match} header matches the
   * block's current revision.
   *
   * <p>Clears any requirement link referencing the deleted attachment within the same transaction.
   * Never calls object storage directly; physical removal is handled asynchronously by the cleanup
   * job.
   *
   * @param servletRequest HTTP request carrying the required {@code If-Match} header
   * @param jwt the JWT principal for the authenticated caller
   * @param reportingUnitId the owning reporting unit
   * @param blockId the owning submission block
   * @param attachmentId the attachment identifier to soft-delete
   */
  @NewSpan
  @Transactional
  public void delete(
      HttpServletRequest servletRequest,
      Jwt jwt,
      Long reportingUnitId,
      Long blockId,
      Long attachmentId) {
    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateClientAccess(jwt, reportingUnit);

    BlockEntity block =
        blockRepository
            .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
            .orElseThrow(() -> new BlockNotFoundException(blockId, reportingUnitId));

    String currentState = resolveBlockState(blockId, block.isDraft());
    Role role = resolveActorRole(jwt, reportingUnit.getClientNumber());
    IdentityProvider provider = jwt != null ? JwtPrincipalUtil.getIdentityProvider(jwt) : null;
    TransitionEvaluationResult editDecision =
        transitionPolicyService.canEdit(currentState, role, provider);
    if (!editDecision.allowed()) {
      throwEditNotAllowed(editDecision, currentState);
    }

    ConditionalRequestSupport.requireMatch(servletRequest, block.getRevision());

    BlockAttachmentEntity attachment =
        attachmentRepository
            .findByIdAndDeletedFalse(attachmentId)
            .orElseThrow(() -> new AttachmentNotFoundException(attachmentId));

    if (!attachment.getBlockId().equals(blockId)) {
      throw new AttachmentNotFoundException(attachmentId, blockId);
    }

    clearLinkedRequirements(blockId, attachmentId);

    attachment.setDeleted(true);
    attachmentRepository.save(attachment);

    log.info("Attachment soft-deleted: id={}, blockId={}", attachmentId, blockId);
  }

  /**
   * Clears any requirement answers referencing the given attachment within the same transaction.
   * Hook completed when requirement-to-attachment linking (#1253) is active.
   */
  private void clearLinkedRequirements(Long blockId, Long attachmentId) {
    List<BlockRequirementEntity> linked =
        blockRequirementRepository.findByBlockIdAndLinkedAttachmentIdAndDeletedFalse(
            blockId, attachmentId);
    if (linked.isEmpty()) {
      return;
    }
    linked.forEach(req -> req.setLinkedAttachmentId(null));
    blockRequirementRepository.saveAll(linked);
  }

  private String resolveBlockState(Long blockId, boolean isDraft) {
    return statusEventRepository
        .findFirstByBlockIdOrderByCreatedAtDescIdDesc(blockId)
        .map(StatusEventEntity::getStatus)
        .orElse(
            isDraft
                ? TransitionPolicyService.STATE_DRAFT
                : TransitionPolicyService.STATE_SUBMITTED);
  }

  private Role resolveActorRole(Jwt jwt, String clientNumber) {
    if (jwt == null) {
      return Role.VIEWER;
    }
    if (JwtPrincipalUtil.hasConcreteRole(jwt, Role.ADMIN)) {
      return Role.ADMIN;
    }
    if (JwtPrincipalUtil.hasConcreteRole(jwt, Role.AREA)) {
      return Role.AREA;
    }
    if (JwtPrincipalUtil.hasConcreteRole(jwt, Role.DISTRICT)) {
      return Role.DISTRICT;
    }
    if (clientNumber != null
        && JwtPrincipalUtil.hasAbstractRole(jwt, Role.SUBMITTER, clientNumber)) {
      return Role.SUBMITTER;
    }
    return Role.VIEWER;
  }

  private void throwEditNotAllowed(TransitionEvaluationResult decision, String currentState) {
    HttpStatus status =
        decision.denialReason() == TransitionEvaluationResult.DenialReason.ROLE_NOT_ALLOWED
            ? HttpStatus.FORBIDDEN
            : HttpStatus.CONFLICT;
    String message =
        status == HttpStatus.FORBIDDEN
            ? decision.reason()
            : "Attachments cannot be removed while the block is in this state";
    ResponseStatusException ex = new ResponseStatusException(status, message);
    ex.getBody().setProperty("code", "EDIT_NOT_ALLOWED");
    ex.getBody().setProperty("state", currentState);
    ex.getBody().setProperty("blockState", currentState);
    throw ex;
  }

  /**
   * Checks whether the specified attachment is considered valid evidence.
   *
   * <p>An attachment is valid if and only if it exists, is not deleted, has {@code status =
   * FINALIZED}, and {@code scan_status = CLEAN}.
   *
   * @param attachmentId the attachment identifier
   * @return true if the attachment is finalized and clean
   */
  @Transactional(readOnly = true)
  public boolean isValid(Long attachmentId) {
    if (attachmentId == null) {
      return false;
    }
    return attachmentRepository
        .findByIdAndDeletedFalse(attachmentId)
        .map(this::isAttachmentValid)
        .orElse(false);
  }

  /**
   * Tests whether an attachment entity has {@code status = FINALIZED} and {@code scan_status =
   * CLEAN}.
   *
   * @param attachment the entity to test
   * @return true if valid evidence
   */
  public boolean isAttachmentValid(BlockAttachmentEntity attachment) {
    return attachment != null
        && !attachment.isDeleted()
        && AttachmentStatus.FINALIZED.name().equals(attachment.getStatus())
        && AttachmentScanStatus.CLEAN.name().equals(attachment.getScanStatus());
  }

  /**
   * Counts the number of valid (FINALIZED and CLEAN) attachments associated with a block.
   *
   * @param blockId the submission block identifier
   * @return count of valid attachments
   */
  @Transactional(readOnly = true)
  public long countValidAttachments(Long blockId) {
    if (blockId == null) {
      return 0;
    }
    return attachmentRepository.countByBlockIdAndStatusAndScanStatusAndDeletedFalse(
        blockId, AttachmentStatus.FINALIZED.name(), AttachmentScanStatus.CLEAN.name());
  }

  /**
   * Retrieves all valid (FINALIZED and CLEAN) attachments associated with a block.
   *
   * @param blockId the submission block identifier
   * @return list of valid attachments
   */
  @Transactional(readOnly = true)
  public List<BlockAttachmentEntity> findValidAttachments(Long blockId) {
    if (blockId == null) {
      return List.of();
    }
    return attachmentRepository.findByBlockIdAndStatusAndScanStatusAndDeletedFalse(
        blockId, AttachmentStatus.FINALIZED.name(), AttachmentScanStatus.CLEAN.name());
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
      throw new InvalidFileNameException("fileName must not be blank");
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
      throw new InvalidFileNameException("fileName does not contain a usable name");
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
    return STAGING_KEY_PREFIX + blockId + "/attachment/pending";
  }

  private static String buildStagingObjectKey(
      long blockId, Long attachmentId, String sanitizedFileName) {
    return STAGING_KEY_PREFIX
        + blockId
        + "/attachment/"
        + attachmentId
        + "/"
        + sanitizedFileName;
  }

  private static String buildPermanentObjectKey(
      long blockId, Long attachmentId, String sanitizedFileName) {
    return PERMANENT_KEY_PREFIX
        + blockId
        + "/attachment/"
        + attachmentId
        + "/"
        + sanitizedFileName;
  }

  private void deleteStagingPostCommit(String stagingKey) {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              try {
                objectStorage.deleteObject(stagingKey);
                log.debug("Deleted staging object post-commit at key {}", stagingKey);
              } catch (Exception e) {
                log.warn(
                    "Failed to delete staging object at key {} after commit: {}",
                    stagingKey,
                    e.getMessage());
              }
            }
          });
    } else {
      try {
        objectStorage.deleteObject(stagingKey);
      } catch (Exception e) {
        log.warn("Failed to delete staging object at key {}: {}", stagingKey, e.getMessage());
      }
    }
  }

  // Retained as defense-in-depth for service-layer callers; primary resource-scope
  // authorization (covering both BCeID client and IDIR district boundaries) is enforced
  // upstream by ResourceScopeGuard before controller execution.
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
        throw new ReportingUnitNotFoundException(reportingUnit.getId());
      }
    }
  }
}

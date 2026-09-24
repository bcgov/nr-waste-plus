package ca.bc.gov.nrs.hrs.service.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import ca.bc.gov.nrs.hrs.configuration.ObjectStorageProperties;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentDocumentType;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentDownloadResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentFinalizeResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentRequest;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.AttachmentConflictException;
import ca.bc.gov.nrs.hrs.exception.AttachmentNotFoundException;
import ca.bc.gov.nrs.hrs.exception.AttachmentSizeExceededException;
import ca.bc.gov.nrs.hrs.exception.BlockNotFoundException;
import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.exception.InvalidDocumentTypeException;
import ca.bc.gov.nrs.hrs.exception.InvalidFileNameException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwtSecurityContextFactory;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageObjectNotFoundException;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageProvider;
import ca.bc.gov.nrs.hrs.provider.objectstorage.PresignedDownload;
import ca.bc.gov.nrs.hrs.provider.objectstorage.PresignedUpload;
import ca.bc.gov.nrs.hrs.provider.objectstorage.StoredObjectSummary;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Attachment Service")
class AttachmentServiceTest {

  private static final long RU_ID = 1L;
  private static final long BLOCK_ID = 2L;
  private static final long ATTACHMENT_ID = 501L;
  private static final Instant EXPIRY = Instant.parse("2026-01-01T00:05:00Z");

  @Mock
  private BlockAttachmentRepository attachmentRepository;

  @Mock
  private BlockRepository blockRepository;

  @Mock(strictness = Mock.Strictness.LENIENT)
  private ReportingUnitRepository reportingUnitRepository;

  @Mock
  private ObjectStorageProvider objectStorage;

  @Mock(strictness = Mock.Strictness.LENIENT)
  private ObjectStorageProperties objectStorageProperties;

  @Mock
  private AttachmentScanService scanService;

  @InjectMocks
  private AttachmentService service;

  @BeforeEach
  void setUp() {
    given(objectStorageProperties.getMaxAttachmentSizeBytes())
        .willReturn(5L * 1024 * 1024);
    given(objectStorageProperties.getPresignedUrlDuration())
        .willReturn(Duration.ofMinutes(5));
    given(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .willReturn(Optional.of(reportingUnit()));
  }

  private ReportingUnitEntity reportingUnit() {
    ReportingUnitEntity ru = new ReportingUnitEntity();
    ru.setId(RU_ID);
    ru.setClientNumber("00012797");
    return ru;
  }

  private AttachmentIntentRequest intentRequest(String documentType) {
    return new AttachmentIntentRequest(
        documentType, "../..\\report FINAL-MAP.pdf", "application/pdf", 1024L);
  }

  private BlockAttachmentEntity persistedAttachment() {
    BlockAttachmentEntity entity = new BlockAttachmentEntity();
    entity.setId(ATTACHMENT_ID);
    entity.setBlockId(BLOCK_ID);
    entity.setScanStatus("PENDING");
    entity.setStatus("UPLOADING");
    entity.setDocumentType(AttachmentDocumentType.FINAL_MAP.name());
    entity.setObjectKey("hrs/staging/block/2/attachment/501/report_FINAL-MAP.pdf");
    entity.setFileName("report_FINAL-MAP.pdf");
    entity.setContentType("application/pdf");
    entity.setFileSizeBytes(1024L);
    return entity;
  }

  private BlockEntity block() {
    BlockEntity block = new BlockEntity();
    block.setId(BLOCK_ID);
    block.setReportingUnitId(RU_ID);
    return block;
  }

  @Test
  @DisplayName("Rejects declared size above the configured maximum")
  void rejectsOversizedDeclaration() {
    AttachmentIntentRequest request =
        new AttachmentIntentRequest(
            AttachmentDocumentType.FINAL_MAP.name(),
            "map.pdf",
            "application/pdf",
            5L * 1024 * 1024 + 1);

    assertThatThrownBy(() -> service.createIntent(null, RU_ID, BLOCK_ID, request))
        .isInstanceOf(AttachmentSizeExceededException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONTENT_TOO_LARGE));
  }

  @Test
  @DisplayName("Rejects invalid document type")
  void rejectsInvalidDocumentType() {
    assertThatThrownBy(
            () -> service.createIntent(null, RU_ID, BLOCK_ID, intentRequest("NOT_A_TYPE")))
        .isInstanceOf(InvalidDocumentTypeException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.BAD_REQUEST));
  }

  @Test
  @DisplayName("Rejects unknown block")
  void rejectsUnknownBlock() {
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.empty());

    assertThatThrownBy(
            () ->
                service.createIntent(
                    null,
                    RU_ID,
                    BLOCK_ID,
                    intentRequest(AttachmentDocumentType.FINAL_MAP.name())))
        .isInstanceOf(BlockNotFoundException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.NOT_FOUND));
  }

  @Test
  @DisplayName("Persists uploading intent and returns server-generated object key")
  void createsIntentAndPersistsUploadingStatus() {
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    ArgumentCaptor<BlockAttachmentEntity> captor =
        ArgumentCaptor.forClass(BlockAttachmentEntity.class);
    given(attachmentRepository.saveAndFlush(captor.capture())).willAnswer(invocation -> {
      BlockAttachmentEntity entity = captor.getValue();
      entity.setId(ATTACHMENT_ID);
      return entity;
    });
    given(attachmentRepository.save(any())).willAnswer(invocation -> invocation.getArgument(0));
    given(
            objectStorage.presignPut(
                eq("hrs/staging/block/2/attachment/501/report_FINAL-MAP.pdf"),
                eq("application/pdf"),
                any()))
        .willReturn(new PresignedUpload("https://s3.example.com/upload", EXPIRY));

    AttachmentIntentResponse response =
        service.createIntent(
            null, RU_ID, BLOCK_ID, intentRequest(AttachmentDocumentType.FINAL_MAP.name()));

    assertThat(response.attachmentId()).isEqualTo(ATTACHMENT_ID);
    assertThat(response.objectKey())
        .isEqualTo("hrs/staging/block/2/attachment/501/report_FINAL-MAP.pdf");
    assertThat(response.uploadUrl()).isEqualTo("https://s3.example.com/upload");
    assertThat(response.expiresAt()).isEqualTo(EXPIRY);

    BlockAttachmentEntity saved = captor.getValue();
    assertThat(saved.getStatus()).isEqualTo(AttachmentStatus.UPLOADING.name());
    assertThat(saved.getDocumentType()).isEqualTo(AttachmentDocumentType.FINAL_MAP.name());
    assertThat(saved.getScanStatus()).isEqualTo(AttachmentScanStatus.PENDING.name());
    assertThat(saved.getFileName()).isEqualTo("report_FINAL-MAP.pdf");
  }

  @Test
  @DisplayName("createAttempt delegates to createIntent")
  void createAttempt_delegatesToCreateIntent() {
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    ArgumentCaptor<BlockAttachmentEntity> captor =
        ArgumentCaptor.forClass(BlockAttachmentEntity.class);
    given(attachmentRepository.saveAndFlush(captor.capture()))
        .willAnswer(
            invocation -> {
              BlockAttachmentEntity entity = invocation.getArgument(0);
              entity.setId(ATTACHMENT_ID);
              return entity;
            });
    given(
            objectStorage.presignPut(
                eq("hrs/staging/block/2/attachment/501/report_FINAL-MAP.pdf"),
                eq("application/pdf"),
                any()))
        .willReturn(new PresignedUpload("https://s3.example.com/upload", EXPIRY));

    AttachmentIntentResponse response =
        service.createAttempt(
            null, RU_ID, BLOCK_ID, intentRequest(AttachmentDocumentType.FINAL_MAP.name()));

    assertThat(response.attachmentId()).isEqualTo(ATTACHMENT_ID);
  }

  @Test
  @DisplayName("Normalizes document type whitespace before persisting")
  void normalizesDocumentTypeWhitespaceBeforePersisting() {
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    ArgumentCaptor<BlockAttachmentEntity> captor =
        ArgumentCaptor.forClass(BlockAttachmentEntity.class);
    given(attachmentRepository.saveAndFlush(captor.capture()))
        .willAnswer(
            invocation -> {
              BlockAttachmentEntity entity = captor.getValue();
              entity.setId(ATTACHMENT_ID);
              return entity;
            });
    given(attachmentRepository.save(any())).willAnswer(invocation -> invocation.getArgument(0));
    given(objectStorage.presignPut(any(), any(), any()))
        .willReturn(new PresignedUpload("https://s3.example.com/upload", EXPIRY));

    service.createIntent(null, RU_ID, BLOCK_ID, intentRequest("  FINAL_MAP  "));

    assertThat(captor.getValue().getDocumentType())
        .isEqualTo(AttachmentDocumentType.FINAL_MAP.name());
  }

  @Test
  @DisplayName("Rejects finalize for unknown attachment")
  void rejectsFinalizeUnknownAttachment() {
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.empty());

    assertThatThrownBy(() -> service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentNotFoundException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.NOT_FOUND));
  }

  @Test
  @DisplayName("Rejects finalize when attachment belongs to a different block")
  void rejectsFinalizeAttachmentForOtherBlock() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setBlockId(999L);
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThatThrownBy(() -> service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentNotFoundException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.NOT_FOUND));
  }

  @Test
  @DisplayName("Rejects finalize for unknown block")
  void rejectsFinalizeUnknownBlock() {
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.empty());

    assertThatThrownBy(() -> service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(BlockNotFoundException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.NOT_FOUND));
  }

  @Test
  @DisplayName("Rejects finalize when no object was uploaded")
  void rejectsFinalizeMissingObject() {
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(persistedAttachment()));
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(objectStorage.headObject(any()))
        .willThrow(
            new ObjectStorageObjectNotFoundException(
                "hrs/block/2/attachment/501/report_FINAL-MAP.pdf", new RuntimeException()));

    assertThatThrownBy(() -> service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentConflictException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("Rejects finalize on size mismatch")
  void rejectsFinalizeSizeMismatch() {
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(persistedAttachment()));
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(objectStorage.headObject(any()))
        .willReturn(new StoredObjectSummary(2048L, "abc123"));

    assertThatThrownBy(() -> service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentConflictException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("Rejects finalize when stored object exceeds maximum allowed size")
  void rejectsFinalizeWhenStoredSizeExceedsMaximum() {
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(persistedAttachment()));
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(objectStorage.headObject(any()))
        .willReturn(new StoredObjectSummary(5L * 1024 * 1024 + 1, "abc123"));

    assertThatThrownBy(() -> service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentSizeExceededException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONTENT_TOO_LARGE));
  }

  @Test
  @DisplayName("Rejects finalize on checksum mismatch when previous checksum exists")
  void rejectsFinalizeChecksumMismatch() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setChecksum("original-checksum");
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(objectStorage.headObject(any()))
        .willReturn(new StoredObjectSummary(1024L, "different-checksum"));

    assertThatThrownBy(() -> service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentConflictException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("Finalizes attachment, promotes staging to permanent, and captures stored checksum")
  void finalizesAttachment() {
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(persistedAttachment()));
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(objectStorage.headObject("hrs/staging/block/2/attachment/501/report_FINAL-MAP.pdf"))
        .willReturn(new StoredObjectSummary(1024L, "abc123"));

    AttachmentFinalizeResponse response =
        service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID);

    assertThat(response.attachmentId()).isEqualTo(ATTACHMENT_ID);
    assertThat(response.status()).isEqualTo("FINALIZED");
    assertThat(response.objectKey())
        .isEqualTo("hrs/block/2/attachment/501/report_FINAL-MAP.pdf");
    assertThat(response.checksum()).isEqualTo("abc123");
    verify(objectStorage)
        .copyObject(
            "hrs/staging/block/2/attachment/501/report_FINAL-MAP.pdf",
            "hrs/block/2/attachment/501/report_FINAL-MAP.pdf");
    verify(objectStorage).deleteObject("hrs/staging/block/2/attachment/501/report_FINAL-MAP.pdf");
    verify(scanService).scan(ATTACHMENT_ID);
  }

  @Test
  @DisplayName("Finalizes attachment idempotently when already FINALIZED without re-copying")
  void finalizeAttachment_whenAlreadyFinalized_returnsExistingWithoutCopy() {
    BlockAttachmentEntity entity = persistedAttachment();
    entity.setStatus(AttachmentStatus.FINALIZED.name());
    entity.setObjectKey("hrs/block/2/attachment/501/report_FINAL-MAP.pdf");
    entity.setChecksum("abc123");

    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(objectStorage.headObject("hrs/block/2/attachment/501/report_FINAL-MAP.pdf"))
        .willReturn(new StoredObjectSummary(1024L, "abc123"));

    AttachmentFinalizeResponse response =
        service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID);

    assertThat(response.attachmentId()).isEqualTo(ATTACHMENT_ID);
    assertThat(response.status()).isEqualTo("FINALIZED");
    assertThat(response.objectKey())
        .isEqualTo("hrs/block/2/attachment/501/report_FINAL-MAP.pdf");
    assertThat(response.checksum()).isEqualTo("abc123");
    verify(objectStorage, never()).copyObject(any(), any());
    verify(objectStorage, never()).deleteObject(any());
  }

  @Test
  @DisplayName("Finalize handles race condition where staging is deleted but permanent exists")
  void finalizeAttachment_whenStagingDeletedAndPermanentExists_resolvesCleanly() {
    BlockAttachmentEntity entity = persistedAttachment();
    BlockAttachmentEntity reloadedFinalized = persistedAttachment();
    reloadedFinalized.setStatus(AttachmentStatus.FINALIZED.name());
    reloadedFinalized.setObjectKey("hrs/block/2/attachment/501/report_FINAL-MAP.pdf");
    reloadedFinalized.setChecksum("abc123");

    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(entity), Optional.of(reloadedFinalized));
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(objectStorage.headObject("hrs/staging/block/2/attachment/501/report_FINAL-MAP.pdf"))
        .willThrow(
            new ObjectStorageObjectNotFoundException(
                "hrs/staging/block/2/attachment/501/report_FINAL-MAP.pdf",
                new RuntimeException()));
    given(objectStorage.headObject("hrs/block/2/attachment/501/report_FINAL-MAP.pdf"))
        .willReturn(new StoredObjectSummary(1024L, "abc123"));

    AttachmentFinalizeResponse response =
        service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID);

    assertThat(response.status()).isEqualTo("FINALIZED");
    assertThat(response.objectKey())
        .isEqualTo("hrs/block/2/attachment/501/report_FINAL-MAP.pdf");
    assertThat(response.checksum()).isEqualTo("abc123");
  }

  @Test
  @DisplayName("Rejects intent creation when reporting unit not found")
  void rejectsIntentWhenReportingUnitNotFound() {
    given(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).willReturn(Optional.empty());

    assertThatThrownBy(
            () ->
                service.createIntent(
                    null,
                    RU_ID,
                    BLOCK_ID,
                    intentRequest(AttachmentDocumentType.FINAL_MAP.name())))
        .isInstanceOf(ReportingUnitNotFoundException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  @DisplayName("Rejects intent creation when BCeID user lacks client role for reporting unit")
  void rejectsIntentWhenBceidUserLacksClientRole() {
    Jwt jwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "bceid-user",
            List.of("WASTE_PLUS_SUBMITTER_99999999"),
            "bceidbusiness",
            "BCeID User",
            "bceid@example.com");

    assertThatThrownBy(
            () ->
                service.createIntent(
                    jwt,
                    RU_ID,
                    BLOCK_ID,
                    intentRequest(AttachmentDocumentType.FINAL_MAP.name())))
        .isInstanceOf(ForbiddenException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  @DisplayName("Allows intent creation when BCeID user has matching client role")
  void allowsIntentWhenBceidUserHasMatchingClientRole() {
    Jwt jwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "bceid-user",
            List.of("WASTE_PLUS_SUBMITTER_00012797"),
            "bceidbusiness",
            "BCeID User",
            "bceid@example.com");

    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.saveAndFlush(any())).willReturn(persistedAttachment());
    given(objectStorage.presignPut(any(), any(), any()))
        .willReturn(new PresignedUpload("https://s3.example.com/upload", EXPIRY));

    AttachmentIntentResponse response =
        service.createIntent(
            jwt, RU_ID, BLOCK_ID, intentRequest(AttachmentDocumentType.FINAL_MAP.name()));

    assertThat(response.attachmentId()).isEqualTo(ATTACHMENT_ID);
  }

  @Test
  @DisplayName("Allows intent creation when IDIR user accesses any reporting unit")
  void allowsIntentWhenIdirUserBypassesClientRole() {
    Jwt jwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "idir-user",
            List.of("WASTE_PLUS_ADMIN"),
            "idir",
            "IDIR User",
            "idir@gov.bc.ca");

    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.saveAndFlush(any())).willReturn(persistedAttachment());
    given(objectStorage.presignPut(any(), any(), any()))
        .willReturn(new PresignedUpload("https://s3.example.com/upload", EXPIRY));

    AttachmentIntentResponse response =
        service.createIntent(
            jwt, RU_ID, BLOCK_ID, intentRequest(AttachmentDocumentType.FINAL_MAP.name()));

    assertThat(response.attachmentId()).isEqualTo(ATTACHMENT_ID);
  }

  @Test
  @DisplayName("Rejects finalize when reporting unit not found")
  void rejectsFinalizeWhenReportingUnitNotFound() {
    given(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).willReturn(Optional.empty());

    assertThatThrownBy(() -> service.finalizeAttachment(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(ReportingUnitNotFoundException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  @DisplayName("Rejects finalize when BCeID user lacks client role for reporting unit")
  void rejectsFinalizeWhenBceidUserLacksClientRole() {
    Jwt jwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "bceid-user",
            List.of("WASTE_PLUS_SUBMITTER_99999999"),
            "bceidbusiness",
            "BCeID User",
            "bceid@example.com");

    assertThatThrownBy(() -> service.finalizeAttachment(jwt, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(ForbiddenException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  @DisplayName("Allows finalize when BCeID user has matching client role")
  void allowsFinalizeWhenBceidUserHasMatchingClientRole() {
    Jwt jwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "bceid-user",
            List.of("WASTE_PLUS_SUBMITTER_00012797"),
            "bceidbusiness",
            "BCeID User",
            "bceid@example.com");

    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(persistedAttachment()));
    given(objectStorage.headObject(any()))
        .willReturn(new StoredObjectSummary(1024L, "abc123"));

    AttachmentFinalizeResponse response =
        service.finalizeAttachment(jwt, RU_ID, BLOCK_ID, ATTACHMENT_ID);

    assertThat(response.status()).isEqualTo("FINALIZED");
  }

  @Test
  @DisplayName("Sanitizes client-supplied file names into safe object-key suffixes")
  void sanitizesFileNames() {
    assertThatThrownBy(() -> AttachmentService.sanitizeFileName("  "))
        .isInstanceOf(InvalidFileNameException.class)
        .satisfies(
            e ->
                assertThat(((ResponseStatusException) e).getStatusCode())
                    .isEqualTo(HttpStatus.BAD_REQUEST));
    assertThat(AttachmentService.sanitizeFileName("final map.pdf")).isEqualTo("final_map.pdf");
    assertThat(AttachmentService.sanitizeFileName("../outside/name v2.xlsx"))
        .isEqualTo("name_v2.xlsx");
    assertThat(AttachmentService.sanitizeFileName("..\\..\\windows\\path.pdf"))
        .isEqualTo("path.pdf");
    assertThat(AttachmentService.sanitizeFileName("x?a=b"))
        .isEqualTo("x_a_b");
  }

  @Test
  @DisplayName("isValid returns true only when attachment is FINALIZED and CLEAN")
  void isValid_returnsTrueWhenFinalizedAndClean() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setScanStatus(AttachmentScanStatus.CLEAN.name());
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThat(service.isValid(ATTACHMENT_ID)).isTrue();
  }

  @Test
  @DisplayName("isValid returns false when attachment is UPLOADING")
  void isValid_returnsFalseWhenUploading() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.UPLOADING.name());
    attachment.setScanStatus(AttachmentScanStatus.CLEAN.name());
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThat(service.isValid(ATTACHMENT_ID)).isFalse();
  }

  @Test
  @DisplayName("isValid returns false when scan_status is PENDING (fail-closed)")
  void isValid_returnsFalseWhenPending() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setScanStatus(AttachmentScanStatus.PENDING.name());
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThat(service.isValid(ATTACHMENT_ID)).isFalse();
  }

  @Test
  @DisplayName("isValid returns false when scan_status is QUARANTINED")
  void isValid_returnsFalseWhenQuarantined() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setScanStatus(AttachmentScanStatus.QUARANTINED.name());
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThat(service.isValid(ATTACHMENT_ID)).isFalse();
  }

  @Test
  @DisplayName("isValid returns false when scan_status is FAILED")
  void isValid_returnsFalseWhenFailed() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setScanStatus(AttachmentScanStatus.FAILED.name());
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThat(service.isValid(ATTACHMENT_ID)).isFalse();
  }

  @Test
  @DisplayName("isValid returns false when attachment is not found or id is null")
  void isValid_returnsFalseWhenNotFoundOrNull() {
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID)).willReturn(Optional.empty());

    assertThat(service.isValid(ATTACHMENT_ID)).isFalse();
    assertThat(service.isValid(null)).isFalse();
  }

  @Test
  @DisplayName("countValidAttachments delegates to repository with FINALIZED and CLEAN")
  void countValidAttachments_delegatesToRepository() {
    given(
            attachmentRepository.countByBlockIdAndStatusAndScanStatusAndDeletedFalse(
                BLOCK_ID, AttachmentStatus.FINALIZED.name(), AttachmentScanStatus.CLEAN.name()))
        .willReturn(3L);

    assertThat(service.countValidAttachments(BLOCK_ID)).isEqualTo(3L);
    assertThat(service.countValidAttachments(null)).isZero();
  }

  @Test
  @DisplayName("findValidAttachments delegates to repository with FINALIZED and CLEAN")
  void findValidAttachments_delegatesToRepository() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setScanStatus(AttachmentScanStatus.CLEAN.name());
    given(
            attachmentRepository.findByBlockIdAndStatusAndScanStatusAndDeletedFalse(
                BLOCK_ID, AttachmentStatus.FINALIZED.name(), AttachmentScanStatus.CLEAN.name()))
        .willReturn(List.of(attachment));

    assertThat(service.findValidAttachments(BLOCK_ID)).containsExactly(attachment);
    assertThat(service.findValidAttachments(null)).isEmpty();
  }

  // --- Quarantine gating download tests ---

  @Test
  @DisplayName("getDownloadUrl returns presigned download URL when attachment is FINALIZED and CLEAN")
  void getDownloadUrl_whenFinalizedAndClean_returnsPresignedUrl() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setScanStatus(AttachmentScanStatus.CLEAN.name());

    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));
    given(objectStorageProperties.getPresignedUrlDuration()).willReturn(Duration.ofMinutes(5));

    Instant expiresAt = Instant.parse("2026-01-01T00:05:00Z");
    given(objectStorage.presignGet(eq(attachment.getObjectKey()), any()))
        .willReturn(new PresignedDownload("https://s3.example.com/download?sig=xyz", expiresAt));

    AttachmentDownloadResponse response =
        service.getDownloadUrl(null, RU_ID, BLOCK_ID, ATTACHMENT_ID);

    assertThat(response.attachmentId()).isEqualTo(ATTACHMENT_ID);
    assertThat(response.fileName()).isEqualTo("report_FINAL-MAP.pdf");
    assertThat(response.downloadUrl())
        .isEqualTo("https://s3.example.com/download?sig=xyz");
    assertThat(response.expiresAt()).isEqualTo(expiresAt);
  }

  @Test
  @DisplayName("getDownloadUrl throws conflict when attachment is UPLOADING")
  void getDownloadUrl_whenUploading_throwsConflict() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.UPLOADING.name());
    attachment.setScanStatus(AttachmentScanStatus.CLEAN.name());

    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThatThrownBy(() -> service.getDownloadUrl(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentConflictException.class);
  }

  @Test
  @DisplayName("getDownloadUrl throws conflict when scan_status is QUARANTINED (gated)")
  void getDownloadUrl_whenQuarantined_throwsConflict() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setScanStatus(AttachmentScanStatus.QUARANTINED.name());

    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThatThrownBy(() -> service.getDownloadUrl(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentConflictException.class);
  }

  @Test
  @DisplayName("getDownloadUrl throws conflict when scan_status is PENDING")
  void getDownloadUrl_whenPending_throwsConflict() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setScanStatus(AttachmentScanStatus.PENDING.name());

    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThatThrownBy(() -> service.getDownloadUrl(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentConflictException.class);
  }

  @Test
  @DisplayName("getDownloadUrl throws conflict when scan_status is FAILED")
  void getDownloadUrl_whenFailed_throwsConflict() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setStatus(AttachmentStatus.FINALIZED.name());
    attachment.setScanStatus(AttachmentScanStatus.FAILED.name());

    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThatThrownBy(() -> service.getDownloadUrl(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentConflictException.class);
  }

  @Test
  @DisplayName("getDownloadUrl throws not found when attachment belongs to a different block")
  void getDownloadUrl_whenBlockMismatch_throwsNotFound() {
    BlockAttachmentEntity attachment = persistedAttachment();
    attachment.setBlockId(999L);

    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .willReturn(Optional.of(block()));
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachment));

    assertThatThrownBy(() -> service.getDownloadUrl(null, RU_ID, BLOCK_ID, ATTACHMENT_ID))
        .isInstanceOf(AttachmentNotFoundException.class);
  }
}

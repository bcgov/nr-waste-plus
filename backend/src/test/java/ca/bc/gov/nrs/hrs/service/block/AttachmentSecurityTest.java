package ca.bc.gov.nrs.hrs.service.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

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
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Security regression test validating the fix for S3 presigned PUT post-finalization overwrites.
 *
 * <p>Uses a stateful in-memory {@link ObjectStorageProvider} test double to simulate the S3 object
 * store lifecycle. Validates that even if an attacker reuses the unexpired presigned PUT URL to
 * overwrite the staging key with a malicious payload after finalization and scanning, downloads
 * continue to serve the immutable, server-controlled permanent object.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Security Regression Test | Attachment Post-Finalization Overwrite Gating")
class AttachmentSecurityTest {

  private static final Long REPORTING_UNIT_ID = 1L;
  private static final Long BLOCK_ID = 2L;
  private static final Long ATTACHMENT_ID = 501L;

  @Mock
  private BlockAttachmentRepository attachmentRepository;

  @Mock
  private BlockRepository blockRepository;

  @Mock
  private ReportingUnitRepository reportingUnitRepository;

  @Mock
  private AttachmentScanService scanService;

  private InMemoryObjectStorageProvider storageProvider;
  private ObjectStorageProperties properties;
  private AttachmentService attachmentService;

  private BlockAttachmentEntity attachmentEntity;

  @BeforeEach
  void setUp() {
    storageProvider = new InMemoryObjectStorageProvider();
    properties = new ObjectStorageProperties();
    properties.setBucket("nr-waste");
    properties.setMaxAttachmentSizeBytes(5L * 1024 * 1024);
    properties.setPresignedUrlDuration(Duration.ofMinutes(15));

    attachmentService =
        new AttachmentService(
            attachmentRepository,
            blockRepository,
            reportingUnitRepository,
            storageProvider,
            properties,
            scanService);

    ReportingUnitEntity ru = new ReportingUnitEntity();
    ru.setId(REPORTING_UNIT_ID);
    given(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .willReturn(Optional.of(ru));

    BlockEntity block = new BlockEntity();
    block.setId(BLOCK_ID);
    block.setReportingUnitId(REPORTING_UNIT_ID);
    given(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, REPORTING_UNIT_ID))
        .willReturn(Optional.of(block));

    attachmentEntity = new BlockAttachmentEntity();
    attachmentEntity.setId(ATTACHMENT_ID);
    attachmentEntity.setBlockId(BLOCK_ID);
    attachmentEntity.setScanStatus(AttachmentScanStatus.PENDING.name());
    attachmentEntity.setStatus(AttachmentStatus.UPLOADING.name());
    attachmentEntity.setDocumentType(AttachmentDocumentType.FINAL_MAP.name());
    attachmentEntity.setFileName("contract.pdf");
    attachmentEntity.setContentType("application/pdf");
    attachmentEntity.setFileSizeBytes(16L);
    attachmentEntity.setObjectKey("hrs/staging/block/2/attachment/501/contract.pdf");

    given(attachmentRepository.saveAndFlush(any()))
        .willAnswer(
            invocation -> {
              BlockAttachmentEntity entity = invocation.getArgument(0);
              if (entity.getId() == null) {
                entity.setId(ATTACHMENT_ID);
              }
              return entity;
            });
    given(attachmentRepository.save(any())).willAnswer(invocation -> invocation.getArgument(0));
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(attachmentEntity));
  }

  @Test
  @DisplayName("Overwriting staging PUT URL post-finalize does not affect served download content")
  void postFinalizeStagingOverwrite_doesNotAffectServedDownload() {
    // Step 1: Client creates upload attempt and obtains presigned PUT URL for staging key
    AttachmentIntentRequest intentRequest =
        new AttachmentIntentRequest(
            AttachmentDocumentType.FINAL_MAP.name(), "contract.pdf", "application/pdf", 16L);
    AttachmentIntentResponse intentResponse =
        attachmentService.createAttempt(null, REPORTING_UNIT_ID, BLOCK_ID, intentRequest);

    String stagingKey = intentResponse.objectKey();
    assertThat(stagingKey).isEqualTo("hrs/staging/block/2/attachment/501/contract.pdf");

    // Step 2: Client uploads benign File A to staging key
    byte[] benignContent = "BENIGN_CONTENT_A".getBytes();
    String benignChecksum = "checksum-aaa";
    storageProvider.putObjectDirect(stagingKey, benignContent, benignChecksum);

    // Step 3: Client finalizes upload; server promotes staging to permanent key and scans
    AttachmentFinalizeResponse finalizeResponse =
        attachmentService.finalizeAttachment(null, REPORTING_UNIT_ID, BLOCK_ID, ATTACHMENT_ID);

    String permanentKey = finalizeResponse.objectKey();
    assertThat(permanentKey).isEqualTo("hrs/block/2/attachment/501/contract.pdf");
    assertThat(finalizeResponse.checksum()).isEqualTo(benignChecksum);

    // Verify storage state: permanent key holds benign content, staging key was deleted
    assertThat(storageProvider.hasObject(permanentKey)).isTrue();
    assertThat(storageProvider.getObjectChecksum(permanentKey)).isEqualTo(benignChecksum);
    assertThat(storageProvider.hasObject(stagingKey)).isFalse();

    // Mark scan status as CLEAN
    attachmentEntity.setScanStatus(AttachmentScanStatus.CLEAN.name());

    // Step 4: Attacker exploits unexpired presigned PUT URL to overwrite stagingKey with malware
    byte[] maliciousContent = "MALICIOUS_PAYLOAD".getBytes();
    String maliciousChecksum = "checksum-malicious-bbb";
    storageProvider.putObjectDirect(stagingKey, maliciousContent, maliciousChecksum);

    // Verify storage state: staging key now holds malware, but permanent key is untouched
    assertThat(storageProvider.getObjectChecksum(stagingKey)).isEqualTo(maliciousChecksum);
    assertThat(storageProvider.getObjectChecksum(permanentKey)).isEqualTo(benignChecksum);

    // Step 5: User or reviewer requests a download URL
    AttachmentDownloadResponse downloadResponse =
        attachmentService.getDownloadUrl(null, REPORTING_UNIT_ID, BLOCK_ID, ATTACHMENT_ID);

    // Assert: download URL targets the permanent key with the original benign content
    assertThat(downloadResponse.downloadUrl())
        .isEqualTo("https://storage.local/hrs/block/2/attachment/501/contract.pdf");
    assertThat(storageProvider.getObjectChecksum(permanentKey)).isEqualTo(benignChecksum);
  }

  /** In-memory stateful test double for {@link ObjectStorageProvider}. */
  private static class InMemoryObjectStorageProvider implements ObjectStorageProvider {

    private record StoredData(byte[] bytes, String checksum) {}

    private final Map<String, StoredData> storage = new ConcurrentHashMap<>();

    void putObjectDirect(String key, byte[] bytes, String checksum) {
      storage.put(key, new StoredData(bytes, checksum));
    }

    boolean hasObject(String key) {
      return storage.containsKey(key);
    }

    String getObjectChecksum(String key) {
      StoredData data = storage.get(key);
      return data != null ? data.checksum() : null;
    }

    @Override
    public PresignedUpload presignPut(
        String objectKey, String contentType, Duration signatureDuration) {
      return new PresignedUpload(
          "https://storage.local/" + objectKey + "?signature=put-sig",
          Instant.now().plus(signatureDuration));
    }

    @Override
    public PresignedDownload presignGet(String objectKey, Duration signatureDuration) {
      return new PresignedDownload(
          "https://storage.local/" + objectKey, Instant.now().plus(signatureDuration));
    }

    @Override
    public StoredObjectSummary headObject(String objectKey) {
      StoredData data = storage.get(objectKey);
      if (data == null) {
        throw new ObjectStorageObjectNotFoundException(
            objectKey, new RuntimeException("Not found"));
      }
      return new StoredObjectSummary((long) data.bytes().length, data.checksum());
    }

    @Override
    public void deleteObject(String objectKey) {
      storage.remove(objectKey);
    }

    @Override
    public void copyObject(String sourceKey, String destinationKey) {
      StoredData data = storage.get(sourceKey);
      if (data == null) {
        throw new ObjectStorageObjectNotFoundException(
            sourceKey, new RuntimeException("Not found"));
      }
      storage.put(destinationKey, data);
    }
  }
}


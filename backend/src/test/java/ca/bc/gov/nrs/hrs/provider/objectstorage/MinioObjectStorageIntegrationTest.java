package ca.bc.gov.nrs.hrs.provider.objectstorage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ca.bc.gov.nrs.hrs.configuration.ObjectStorageProperties;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentDocumentType;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentDownloadResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentFinalizeResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentRequest;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.MinioContainerSupport;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.service.block.AttachmentScanStatusService;
import ca.bc.gov.nrs.hrs.service.block.AttachmentService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@DisplayName("Integrated Test | MinIO Object Storage Provider and Attachment Lifecycle")
class MinioObjectStorageIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private ObjectStorageProvider objectStorageProvider;

  @Autowired
  private ObjectStorageProperties objectStorageProperties;

  @Autowired
  private S3Client s3Client;

  @Autowired
  private AttachmentService attachmentService;

  @Autowired
  private AttachmentScanStatusService attachmentScanStatusService;

  @Autowired
  private ReportingUnitRepository reportingUnitRepository;

  @Autowired
  private BlockRepository blockRepository;

  @Test
  @DisplayName("Full upload, finalize, copy, download, and delete lifecycle works against MinIO")
  void uploadFinalizeAndDownloadCycle() throws Exception {
    String stagingKey = "hrs/staging/block/1/attachment/" + UUID.randomUUID() + "/document.pdf";
    String permanentKey = "hrs/block/1/attachment/" + UUID.randomUUID() + "/document.pdf";
    byte[] payload = "%PDF-1.4 test attachment content bytes".getBytes(StandardCharsets.UTF_8);

    // 1. Presign PUT URL
    PresignedUpload presignedUpload =
        objectStorageProvider.presignPut(stagingKey, "application/pdf", Duration.ofMinutes(5));
    assertThat(presignedUpload.uploadUrl()).isNotBlank();
    assertThat(presignedUpload.expiresAt()).isAfter(Instant.now());

    // 2. Upload file via presigned PUT URL
    HttpClient httpClient = HttpClient.newHttpClient();
    HttpRequest putRequest =
        HttpRequest.newBuilder()
            .uri(URI.create(presignedUpload.uploadUrl()))
            .header("Content-Type", "application/pdf")
            .PUT(HttpRequest.BodyPublishers.ofByteArray(payload))
            .build();
    HttpResponse<Void> putResponse =
        httpClient.send(putRequest, HttpResponse.BodyHandlers.discarding());
    assertThat(putResponse.statusCode()).isEqualTo(200);

    // 3. Inspect metadata via HEAD
    StoredObjectSummary summary = objectStorageProvider.headObject(stagingKey);
    assertThat(summary.sizeBytes()).isEqualTo(payload.length);
    assertThat(summary.checksum()).isNotBlank();

    // 4. Promote object via server-side copy
    String copiedChecksum =
        objectStorageProvider.copyObject(stagingKey, permanentKey, summary.checksum());
    assertThat(copiedChecksum).isEqualTo(summary.checksum());

    // 5. Presign GET URL and download content
    PresignedDownload presignedDownload =
        objectStorageProvider.presignGet(permanentKey, Duration.ofMinutes(5));
    assertThat(presignedDownload.downloadUrl()).isNotBlank();

    HttpRequest getRequest =
        HttpRequest.newBuilder().uri(URI.create(presignedDownload.downloadUrl())).GET().build();
    HttpResponse<byte[]> getResponse =
        httpClient.send(getRequest, HttpResponse.BodyHandlers.ofByteArray());
    assertThat(getResponse.statusCode()).isEqualTo(200);
    assertThat(getResponse.body()).isEqualTo(payload);

    // 6. Delete staging and permanent objects
    objectStorageProvider.deleteObject(stagingKey);
    assertThatThrownBy(() -> objectStorageProvider.headObject(stagingKey))
        .isInstanceOf(ObjectStorageObjectNotFoundException.class);

    objectStorageProvider.deleteObject(permanentKey);
    assertThatThrownBy(() -> objectStorageProvider.headObject(permanentKey))
        .isInstanceOf(ObjectStorageObjectNotFoundException.class);
  }

  @Test
  @DisplayName("Path-style addressing S3_FORCE_PATH_STYLE works against MinIO")
  void pathStyleAddressingWorksAgainstMinio() {
    String testKey = "hrs/test/pathstyle-" + UUID.randomUUID() + ".txt";

    // Presign PUT should format URL with bucket in path rather than subdomain
    PresignedUpload presignedUpload =
        objectStorageProvider.presignPut(testKey, "text/plain", Duration.ofMinutes(5));

    URI uploadUri = URI.create(presignedUpload.uploadUrl());
    String bucket = objectStorageProperties.getBucket();

    // In path-style, the path starts with /<bucket>/
    assertThat(uploadUri.getPath()).startsWith("/" + bucket + "/");
    // And the host does not contain the bucket as a subdomain prefix
    assertThat(uploadUri.getHost()).doesNotStartWith(bucket + ".");
  }

  @Test
  @DisplayName("Isolated buckets prevent state collision across pipeline runs")
  void bucketIsolationPreventsCollisionsBetweenRuns() {
    String bucketA = "nr-waste-run-" + UUID.randomUUID().toString().substring(0, 8);
    String bucketB = "nr-waste-run-" + UUID.randomUUID().toString().substring(0, 8);

    MinioContainerSupport.createBucket(bucketA);
    MinioContainerSupport.createBucket(bucketB);

    String key = "test-object-" + UUID.randomUUID() + ".txt";
    byte[] content = "Run A specific content".getBytes(StandardCharsets.UTF_8);

    // Put object into bucketA
    s3Client.putObject(
        PutObjectRequest.builder().bucket(bucketA).key(key).build(),
        RequestBody.fromBytes(content));

    // Verify present in bucketA
    var headA = s3Client.headObject(HeadObjectRequest.builder().bucket(bucketA).key(key).build());
    assertThat(headA.contentLength()).isEqualTo(content.length);

    // Verify absent from bucketB
    assertThatThrownBy(
            () ->
                s3Client.headObject(
                    HeadObjectRequest.builder().bucket(bucketB).key(key).build()))
        .isInstanceOf(NoSuchKeyException.class);

    // Clean up
    s3Client.deleteObject(b -> b.bucket(bucketA).key(key));
  }

  @Test
  @DisplayName("AttachmentService intent, upload, finalize, and download lifecycle end-to-end")
  void attachmentServiceLifecycleEndToEnd() throws Exception {
    String uniqueId = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    ReportingUnitEntity ru = new ReportingUnitEntity();
    ru.setClientNumber(uniqueId);
    ru.setClientLocnCode("LOC-" + uniqueId.substring(0, 4));
    ru.setOrgUnitNo("DCC");
    ru.setRevision(1L);
    ru.setCreatedBy("test");
    ru.setCreatedAt(Instant.now());
    ru.setUpdatedBy("test");
    ru.setUpdatedAt(Instant.now());
    ReportingUnitEntity savedRu = reportingUnitRepository.saveAndFlush(ru);

    BlockEntity block = new BlockEntity();
    block.setReportingUnitId(savedRu.getId());
    block.setBlockType("DISTRICT_AVERAGE");
    block.setDraft(false);
    block.setPlcDate(LocalDate.of(2025, Month.JUNE, 1));
    block.setRevision(1L);
    block.setCreatedBy("test");
    block.setCreatedAt(Instant.now());
    block.setUpdatedBy("test");
    block.setUpdatedAt(Instant.now());
    BlockEntity savedBlock = blockRepository.saveAndFlush(block);

    byte[] payload = "%PDF-1.4 End to end attachment test content".getBytes(StandardCharsets.UTF_8);

    // 1. Create upload intent
    AttachmentIntentRequest intentRequest =
        new AttachmentIntentRequest(
            AttachmentDocumentType.FINAL_MAP.name(),
            "final-map.pdf",
            "application/pdf",
            (long) payload.length);

    AttachmentIntentResponse intentResponse =
        attachmentService.createIntent(jwt, savedRu.getId(), savedBlock.getId(), intentRequest);

    assertThat(intentResponse.attachmentId()).isNotNull();
    assertThat(intentResponse.uploadUrl()).isNotBlank();

    // 2. Client uploads bytes directly to MinIO presigned URL
    HttpClient httpClient = HttpClient.newHttpClient();
    HttpRequest putRequest =
        HttpRequest.newBuilder()
            .uri(URI.create(intentResponse.uploadUrl()))
            .header("Content-Type", "application/pdf")
            .PUT(HttpRequest.BodyPublishers.ofByteArray(payload))
            .build();
    HttpResponse<Void> putResponse =
        httpClient.send(putRequest, HttpResponse.BodyHandlers.discarding());
    assertThat(putResponse.statusCode()).isEqualTo(200);

    // 3. Finalize upload
    AttachmentFinalizeResponse finalizeResponse =
        attachmentService.finalizeAttachment(
            jwt, savedRu.getId(), savedBlock.getId(), intentResponse.attachmentId());

    assertThat(finalizeResponse.status()).isEqualTo(AttachmentStatus.FINALIZED.name());
    assertThat(finalizeResponse.checksum()).isNotBlank();

    // 4. Mark attachment scan status as CLEAN
    attachmentScanStatusService.updateScanStatus(
        intentResponse.attachmentId(), AttachmentScanStatus.CLEAN);

    // 5. Retrieve presigned download URL and verify download content
    AttachmentDownloadResponse downloadResponse =
        attachmentService.getDownloadUrl(
            jwt, savedRu.getId(), savedBlock.getId(), intentResponse.attachmentId());

    assertThat(downloadResponse.downloadUrl()).isNotBlank();

    HttpRequest getRequest =
        HttpRequest.newBuilder().uri(URI.create(downloadResponse.downloadUrl())).GET().build();
    HttpResponse<byte[]> getResponse =
        httpClient.send(getRequest, HttpResponse.BodyHandlers.ofByteArray());
    assertThat(getResponse.statusCode()).isEqualTo(200);
    assertThat(getResponse.body()).isEqualTo(payload);
  }
}

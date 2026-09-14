package ca.bc.gov.nrs.hrs.provider.objectstorage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import ca.bc.gov.nrs.hrs.configuration.ObjectStorageProperties;
import java.net.URL;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | S3 Object Storage Provider")
class S3ObjectStorageProviderTest {

  @Mock
  private S3Client s3Client;

  @Mock
  private S3Presigner presigner;

  @Mock(lenient = true)
  private ObjectStorageProperties properties;

  @InjectMocks
  private S3ObjectStorageProvider provider;

  @BeforeEach
  void setUp() {
    given(properties.getBucket()).willReturn("nr-waste");
  }

  @Test
  @DisplayName("Presigns a PUT URL with the requested expiry")
  void presignPut_returnsUrlAndFutureExpiry() throws Exception {
    Instant expectedExpiry = Instant.parse("2026-08-24T12:05:00Z");
    PresignedPutObjectRequest presigned =
        org.mockito.Mockito.mock(PresignedPutObjectRequest.class);
    given(presigned.url()).willReturn(new URL("https://s3.example.com/upload"));
    given(presigned.expiration()).willReturn(expectedExpiry);
    given(presigner.presignPutObject(any(PutObjectPresignRequest.class))).willReturn(presigned);

    PresignedUpload upload =
        provider.presignPut(
            "hrs/block/1/attachment/501/map.pdf", "application/pdf", Duration.ofMinutes(5));

    assertThat(upload.uploadUrl()).isEqualTo("https://s3.example.com/upload");
    assertThat(upload.expiresAt()).isEqualTo(expectedExpiry);
  }

  @Test
  @DisplayName("Head object reports stored size and normalized checksum")
  void headObject_returnsSizeAndChecksum() {
    given(s3Client.headObject(any(HeadObjectRequest.class)))
        .willReturn(HeadObjectResponse.builder().contentLength(1024L).eTag("\"abc123\"").build());

    StoredObjectSummary summary =
        provider.headObject("hrs/block/1/attachment/501/map.pdf");

    assertThat(summary.sizeBytes()).isEqualTo(1024L);
    assertThat(summary.checksum()).isEqualTo("abc123");
  }

  @Test
  @DisplayName("Head object yields null checksum when no ETag is returned")
  void headObject_returnsNullChecksumWhenMissing() {
    given(s3Client.headObject(any(HeadObjectRequest.class)))
        .willReturn(HeadObjectResponse.builder().contentLength(0L).eTag(null).build());

    StoredObjectSummary summary =
        provider.headObject("hrs/block/1/attachment/501/map.pdf");

    assertThat(summary.sizeBytes()).isZero();
    assertThat(summary.checksum()).isNull();
  }

  @Test
  @DisplayName("Head object maps a 404 to ObjectStorageObjectNotFoundException")
  void headObject_404_throwsObjectNotFound() {
    given(s3Client.headObject(any(HeadObjectRequest.class)))
        .willThrow(S3Exception.builder().statusCode(404).message("Not Found").build());

    assertThatThrownBy(() -> provider.headObject("missing"))
        .isInstanceOf(ObjectStorageObjectNotFoundException.class);
  }

  @Test
  @DisplayName("Head object rethrows non-404 storage errors")
  void headObject_otherErrors_areRethrown() {
    given(s3Client.headObject(any(HeadObjectRequest.class)))
        .willThrow(S3Exception.builder().statusCode(500).message("Internal").build());

    assertThatThrownBy(() -> provider.headObject("key"))
        .isInstanceOf(S3Exception.class);
  }
}

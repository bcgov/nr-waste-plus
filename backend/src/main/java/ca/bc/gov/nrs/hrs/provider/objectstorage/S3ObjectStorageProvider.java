package ca.bc.gov.nrs.hrs.provider.objectstorage;

import ca.bc.gov.nrs.hrs.configuration.ObjectStorageProperties;
import io.micrometer.observation.annotation.Observed;
import java.net.HttpURLConnection;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/** S3-compatible implementation of {@link ObjectStorageProvider} backed by the AWS SDK v2. */
@Component
@RequiredArgsConstructor
@Observed
@Slf4j
public class S3ObjectStorageProvider implements ObjectStorageProvider {

  private final S3Client s3Client;
  private final S3Presigner presigner;
  private final ObjectStorageProperties properties;

  @Override
  public PresignedUpload presignPut(
      String objectKey, String contentType, Duration signatureDuration) {
    PutObjectRequest putObjectRequest =
        PutObjectRequest.builder()
            .bucket(properties.getBucket())
            .key(objectKey)
            .contentType(contentType)
            .build();
    PutObjectPresignRequest presignRequest =
        PutObjectPresignRequest.builder()
            .signatureDuration(signatureDuration)
            .putObjectRequest(putObjectRequest)
            .build();

    PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);
    return new PresignedUpload(presigned.url().toString(), presigned.expiration());
  }

  @Override
  public StoredObjectSummary headObject(String objectKey) {
    HeadObjectRequest request =
        HeadObjectRequest.builder().bucket(properties.getBucket()).key(objectKey).build();
    try {
      HeadObjectResponse response = s3Client.headObject(request);
      return new StoredObjectSummary(
          response.contentLength(), normalizeChecksum(response.eTag()));
    } catch (S3Exception e) {
      if (e.statusCode() == HttpURLConnection.HTTP_NOT_FOUND) {
        throw new ObjectStorageObjectNotFoundException(objectKey, e);
      }
      throw e;
    }
  }

  private String normalizeChecksum(String etag) {
    if (etag == null) {
      return null;
    }
    String trimmed = etag.trim();
    if (trimmed.length() >= 2 && trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
      trimmed = trimmed.substring(1, trimmed.length() - 1);
    }
    return trimmed.isEmpty() ? null : trimmed;
  }
}

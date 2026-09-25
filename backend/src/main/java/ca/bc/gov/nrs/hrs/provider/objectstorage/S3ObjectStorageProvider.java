package ca.bc.gov.nrs.hrs.provider.objectstorage;

import ca.bc.gov.nrs.hrs.configuration.ObjectStorageProperties;
import io.micrometer.observation.annotation.Observed;
import java.net.HttpURLConnection;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.CopyObjectResponse;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.MetadataDirective;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
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
  public PresignedDownload presignGet(String objectKey, Duration signatureDuration) {
    GetObjectRequest getObjectRequest =
        GetObjectRequest.builder()
            .bucket(properties.getBucket())
            .key(objectKey)
            .build();
    GetObjectPresignRequest presignRequest =
        GetObjectPresignRequest.builder()
            .signatureDuration(signatureDuration)
            .getObjectRequest(getObjectRequest)
            .build();

    PresignedGetObjectRequest presigned = presigner.presignGetObject(presignRequest);
    return new PresignedDownload(presigned.url().toString(), presigned.expiration());
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

  @Override
  public void deleteObject(String objectKey) {
    DeleteObjectRequest request =
        DeleteObjectRequest.builder().bucket(properties.getBucket()).key(objectKey).build();
    try {
      s3Client.deleteObject(request);
      log.debug("Deleted object from storage at key {}", objectKey);
    } catch (NoSuchKeyException e) {
      log.debug("Object not found when deleting key {}: {}", objectKey, e.getMessage());
    } catch (S3Exception e) {
      if (e.statusCode() == HttpURLConnection.HTTP_NOT_FOUND) {
        log.debug("Object not found (404) when deleting key {}", objectKey);
        return;
      }
      log.error("Failed to delete object from storage at key {}", objectKey, e);
      throw e;
    }
  }

  @Override
  public String copyObject(
      String sourceKey, String destinationKey, String expectedSourceChecksum) {
    CopyObjectRequest.Builder builder =
        CopyObjectRequest.builder()
            .sourceBucket(properties.getBucket())
            .sourceKey(sourceKey)
            .destinationBucket(properties.getBucket())
            .destinationKey(destinationKey)
            .metadataDirective(MetadataDirective.COPY);

    if (expectedSourceChecksum != null && !expectedSourceChecksum.isBlank()) {
      builder.copySourceIfMatch(formatEtag(expectedSourceChecksum));
    }

    CopyObjectRequest request = builder.build();
    try {
      CopyObjectResponse response = s3Client.copyObject(request);
      String resultChecksum = null;
      if (response.copyObjectResult() != null) {
        resultChecksum = normalizeChecksum(response.copyObjectResult().eTag());
      }
      log.debug(
          "Copied object from key {} to {} in bucket {} (result checksum: {})",
          sourceKey,
          destinationKey,
          properties.getBucket(),
          resultChecksum);
      return resultChecksum;
    } catch (NoSuchKeyException e) {
      throw new ObjectStorageObjectNotFoundException(sourceKey, e);
    } catch (S3Exception e) {
      if (e.statusCode() == HttpURLConnection.HTTP_NOT_FOUND) {
        throw new ObjectStorageObjectNotFoundException(sourceKey, e);
      }
      if (e.statusCode() == HttpURLConnection.HTTP_PRECON_FAILED) {
        throw new ObjectStoragePreconditionFailedException(sourceKey, e);
      }
      log.error(
          "Failed to copy object from key {} to {} in bucket {}",
          sourceKey,
          destinationKey,
          properties.getBucket(),
          e);
      throw e;
    }
  }

  private String formatEtag(String checksum) {
    if (checksum == null || checksum.isBlank()) {
      return null;
    }
    String trimmed = checksum.trim();
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
      return trimmed;
    }
    return "\"" + trimmed + "\"";
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

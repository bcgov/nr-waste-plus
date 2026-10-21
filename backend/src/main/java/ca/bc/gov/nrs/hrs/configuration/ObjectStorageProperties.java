package ca.bc.gov.nrs.hrs.configuration;

import java.time.Duration;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * S3/MinIO object-storage settings bound from properties with prefix {@code
 * ca.bc.gov.nrs.object-storage}.
 *
 * <p>When no {@code endpoint} is configured the AWS SDK resolves the default endpoint and
 * credentials for the configured region. Supplying an {@code endpoint} (for example a local MinIO
 * URL) switches the client to path-style access with the provided static credentials.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Component
@ConfigurationProperties("ca.bc.gov.nrs.object-storage")
public class ObjectStorageProperties {

  /** Optional custom endpoint (for example {@code http://localhost:9000} for MinIO). */
  private String endpoint;

  /**
   * Optional client-facing endpoint for presigned URLs (for example a public HTTPS MinIO route).
   * Defaults to {@code endpoint} if not specified.
   */
  private String presignerEndpoint;

  /**
   * Resolves the endpoint to use for presigning URLs.
   *
   * @return the presigner endpoint if configured, otherwise the primary endpoint
   */
  public String getPresignerEndpoint() {
    return StringUtils.isNotBlank(presignerEndpoint)
        ? presignerEndpoint
        : endpoint;
  }

  /** AWS region used for signing; MinIO deployments ignore the exact value. */
  private String region;

  /** Static access key used when a custom endpoint is configured. */
  private String accessKey;

  /** Static secret key used when a custom endpoint is configured. */
  private String secretKey;

  /** Bucket that holds attachment objects. */
  private String bucket;

  /** Whether to force path-style addressing (required for MinIO). */
  private boolean forcePathStyle;

  /** Lifetime of presigned upload URLs. */
  private Duration presignedUrlDuration;

  /** Maximum accepted attachment size in bytes. */
  private long maxAttachmentSizeBytes;
}


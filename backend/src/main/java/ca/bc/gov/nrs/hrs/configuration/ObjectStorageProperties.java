package ca.bc.gov.nrs.hrs.configuration;

import java.time.Duration;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
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
  @Builder.Default
  private String endpoint = "";

  /** AWS region used for signing; MinIO deployments ignore the exact value. */
  @Builder.Default
  private String region = "ca-central-1";

  /** Static access key used when a custom endpoint is configured. */
  @Builder.Default
  private String accessKey = "";

  /** Static secret key used when a custom endpoint is configured. */
  @Builder.Default
  private String secretKey = "";

  /** Bucket that holds attachment objects. */
  @Builder.Default
  private String bucket = "nr-waste";

  /** Whether to force path-style addressing (required for MinIO). */
  @Builder.Default
  private boolean forcePathStyle = false;

  /** Lifetime of presigned upload URLs. */
  @Builder.Default
  private Duration presignedUrlDuration = Duration.ofMinutes(5);

  /** Maximum accepted attachment size in bytes. */
  @Builder.Default
  private long maxAttachmentSizeBytes = 5L * 1024 * 1024;
}
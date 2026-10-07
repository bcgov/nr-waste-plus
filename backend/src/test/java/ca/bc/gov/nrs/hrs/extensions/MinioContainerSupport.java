package ca.bc.gov.nrs.hrs.extensions;

import java.net.URI;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.awscore.exception.AwsServiceException;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;

/**
 * Testcontainers support for MinIO object storage in integration tests.
 *
 * <p>If an external MinIO instance is configured via environment variables (such as in CI/PR
 * pipelines with {@code OBJECT_STORAGE_ENDPOINT}), Testcontainers is bypassed and tests connect to
 * the external instance with its isolated bucket. Otherwise, a Testcontainers MinIO container is
 * lazily started with dynamic, uncommitted credentials and an isolated bucket.
 */
@Slf4j
public final class MinioContainerSupport {

  private static final String DEFAULT_IMAGE = "cgr.dev/chainguard/minio:latest";
  private static final String DEFAULT_REGION = "ca-central-1";

  private static MinIOContainer minioContainer;
  private static String isolatedBucket;

  private MinioContainerSupport() {}

  /**
   * Checks whether an external MinIO or S3 endpoint is configured in the environment.
   *
   * @return true if an external endpoint is provided
   */
  public static boolean isExternalMinioConfigured() {
    String endpoint = System.getenv("OBJECT_STORAGE_ENDPOINT");
    if (endpoint != null && !endpoint.isBlank()) {
      return true;
    }
    String propEndpoint = System.getProperty("ca.bc.gov.nrs.object-storage.endpoint");
    return propEndpoint != null && !propEndpoint.isBlank();
  }

  /**
   * Returns the running MinIOContainer instance, initializing and starting it if needed. Returns
   * null if external MinIO configuration is present.
   *
   * @return the running MinIOContainer, or null if using an external instance
   */
  public static synchronized MinIOContainer getContainer() {
    if (isExternalMinioConfigured()) {
      return null;
    }
    if (minioContainer == null) {
      String imageName =
          System.getProperty(
              "testcontainers.minio.image",
              System.getenv().getOrDefault("TESTCONTAINERS_MINIO_IMAGE", DEFAULT_IMAGE));
      String username = "minio_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
      String password = UUID.randomUUID().toString();
      isolatedBucket = "nr-waste-test-" + UUID.randomUUID();

      minioContainer =
          new MinIOContainer(
                  DockerImageName.parse(imageName).asCompatibleSubstituteFor("minio/minio"))
              .withUserName(username)
              .withPassword(password);
      minioContainer.start();
      createBucket(minioContainer.getS3URL(), username, password, isolatedBucket);
      log.info(
          "Started Testcontainers MinIO at {} with bucket {}",
          minioContainer.getS3URL(),
          isolatedBucket);
    }
    return minioContainer;
  }

  /**
   * Returns the isolated bucket name for Testcontainers runs.
   *
   * @return bucket name
   */
  public static synchronized String getIsolatedBucket() {
    if (isolatedBucket == null) {
      getContainer();
    }
    return isolatedBucket;
  }

  /**
   * Registers dynamic properties for Spring Boot tests.
   *
   * @param registry the DynamicPropertyRegistry
   */
  public static void registerDynamicProperties(DynamicPropertyRegistry registry) {
    if (isExternalMinioConfigured()) {
      log.info("Using externally provisioned MinIO instance from environment");
      return;
    }
    MinIOContainer container = getContainer();
    if (container != null && container.isRunning()) {
      registry.add("ca.bc.gov.nrs.object-storage.endpoint", container::getS3URL);
      registry.add("ca.bc.gov.nrs.object-storage.access-key", container::getUserName);
      registry.add("ca.bc.gov.nrs.object-storage.secret-key", container::getPassword);
      registry.add("ca.bc.gov.nrs.object-storage.bucket", MinioContainerSupport::getIsolatedBucket);
      registry.add("ca.bc.gov.nrs.object-storage.force-path-style", () -> "true");
    }
  }

  /**
   * Creates a bucket on the active MinIO instance (either external or Testcontainers).
   *
   * @param bucketName the bucket name to create
   */
  public static void createBucket(String bucketName) {
    if (isExternalMinioConfigured()) {
      String endpoint =
          System.getenv()
              .getOrDefault(
                  "OBJECT_STORAGE_ENDPOINT",
                  System.getProperty("ca.bc.gov.nrs.object-storage.endpoint"));
      String accessKey =
          System.getenv()
              .getOrDefault(
                  "OBJECT_STORAGE_ACCESS_KEY",
                  System.getProperty("ca.bc.gov.nrs.object-storage.access-key", ""));
      String secretKey =
          System.getenv()
              .getOrDefault(
                  "OBJECT_STORAGE_SECRET_KEY",
                  System.getProperty("ca.bc.gov.nrs.object-storage.secret-key", ""));
      createBucket(endpoint, accessKey, secretKey, bucketName);
    } else {
      MinIOContainer container = getContainer();
      if (container != null && container.isRunning()) {
        createBucket(
            container.getS3URL(), container.getUserName(), container.getPassword(), bucketName);
      }
    }
  }

  /**
   * Creates a bucket if it does not already exist.
   *
   * @param endpoint MinIO endpoint URL
   * @param accessKey access key
   * @param secretKey secret key
   * @param bucket bucket name to create
   */
  public static void createBucket(
      String endpoint, String accessKey, String secretKey, String bucket) {
    try (S3Client client =
        S3Client.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(
                StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
            .region(Region.of(DEFAULT_REGION))
            .forcePathStyle(true)
            .httpClientBuilder(UrlConnectionHttpClient.builder())
            .build()) {
      try {
        client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
      } catch (NoSuchBucketException e) {
        client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
      } catch (AwsServiceException e) {
        if (e.statusCode() == 404) {
          client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
        } else {
          throw e;
        }
      }
    }
  }
}

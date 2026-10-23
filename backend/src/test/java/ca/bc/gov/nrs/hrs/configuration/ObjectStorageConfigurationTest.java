package ca.bc.gov.nrs.hrs.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@DisplayName("Unit Test | Object Storage Configuration and Properties")
class ObjectStorageConfigurationTest {

  @Nested
  @DisplayName("ObjectStorageProperties")
  class PropertiesTest {

    @Test
    @DisplayName("getPresignerEndpoint returns configured presignerEndpoint when set")
    void returnsPresignerEndpointWhenSet() {
      ObjectStorageProperties properties =
          ObjectStorageProperties.builder()
              .endpoint("http://internal-minio:9000")
              .presignerEndpoint("https://public-minio.apps.silver.devops.gov.bc.ca")
              .build();

      assertThat(properties.getPresignerEndpoint())
          .isEqualTo("https://public-minio.apps.silver.devops.gov.bc.ca");
    }

    @Test
    @DisplayName("getPresignerEndpoint falls back to endpoint when presignerEndpoint is null")
    void fallsBackToEndpointWhenNull() {
      ObjectStorageProperties properties =
          ObjectStorageProperties.builder()
              .endpoint("http://internal-minio:9000")
              .presignerEndpoint(null)
              .build();

      assertThat(properties.getPresignerEndpoint()).isEqualTo("http://internal-minio:9000");
    }

    @Test
    @DisplayName("getPresignerEndpoint falls back to endpoint when presignerEndpoint is blank")
    void fallsBackToEndpointWhenBlank() {
      ObjectStorageProperties properties =
          ObjectStorageProperties.builder()
              .endpoint("http://internal-minio:9000")
              .presignerEndpoint("   ")
              .build();

      assertThat(properties.getPresignerEndpoint()).isEqualTo("http://internal-minio:9000");
    }
  }

  @Nested
  @DisplayName("ObjectStorageConfiguration Beans")
  class ConfigurationBeansTest {

    private final ApplicationContextRunner contextRunner =
        new ApplicationContextRunner()
            .withUserConfiguration(ObjectStorageConfiguration.class);

    @Test
    @DisplayName("presigns URLs using separate presignerEndpoint when configured")
    void presignsWithSeparatePresignerEndpoint() {
      ObjectStorageProperties properties =
          ObjectStorageProperties.builder()
              .endpoint("http://internal-minio:9000")
              .presignerEndpoint("https://public-minio.apps.silver.devops.gov.bc.ca")
              .region("ca-central-1")
              .accessKey("test-access-key")
              .secretKey("test-secret-key")
              .bucket("test-bucket")
              .forcePathStyle(true)
              .build();

      contextRunner
          .withBean(ObjectStorageProperties.class, () -> properties)
          .run(
              context -> {
                assertThat(context).hasSingleBean(S3Client.class);
                assertThat(context).hasSingleBean(S3Presigner.class);

                S3Presigner presigner = context.getBean(S3Presigner.class);
                PresignedPutObjectRequest presigned =
                    presigner.presignPutObject(
                        PutObjectPresignRequest.builder()
                            .signatureDuration(Duration.ofMinutes(5))
                            .putObjectRequest(
                                PutObjectRequest.builder()
                                    .bucket("test-bucket")
                                    .key("test-key.pdf")
                                    .build())
                            .build());

                assertThat(presigned.url().getHost())
                    .isEqualTo("public-minio.apps.silver.devops.gov.bc.ca");
                assertThat(presigned.url().getProtocol()).isEqualTo("https");
              });
    }

    @Test
    @DisplayName("presigns URLs using primary endpoint when presignerEndpoint is omitted")
    void presignsWithPrimaryEndpointWhenPresignerOmitted() {
      ObjectStorageProperties properties =
          ObjectStorageProperties.builder()
              .endpoint("http://internal-minio:9000")
              .presignerEndpoint(null)
              .region("ca-central-1")
              .accessKey("test-access-key")
              .secretKey("test-secret-key")
              .bucket("test-bucket")
              .forcePathStyle(true)
              .build();

      contextRunner
          .withBean(ObjectStorageProperties.class, () -> properties)
          .run(
              context -> {
                S3Presigner presigner = context.getBean(S3Presigner.class);
                PresignedPutObjectRequest presigned =
                    presigner.presignPutObject(
                        PutObjectPresignRequest.builder()
                            .signatureDuration(Duration.ofMinutes(5))
                            .putObjectRequest(
                                PutObjectRequest.builder()
                                    .bucket("test-bucket")
                                    .key("test-key.pdf")
                                    .build())
                            .build());

                assertThat(presigned.url().getHost()).isEqualTo("internal-minio");
                assertThat(presigned.url().getPort()).isEqualTo(9000);
                assertThat(presigned.url().getProtocol()).isEqualTo("http");
              });
    }
  }
}


package ca.bc.gov.nrs.hrs.configuration;

import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Configures the S3-compatible clients used for the attachment upload lifecycle.
 *
 * <p>Two beans are created: an {@link S3Client} for metadata/HEAD operations and an {@link
 * S3Presigner} for short-lived presigned PUT URLs. Both work against AWS S3 and MinIO; a custom
 * {@code endpoint} switches to static credentials and path-style addressing.
 */
@Configuration
@RequiredArgsConstructor
public class ObjectStorageConfiguration {

  private final ObjectStorageProperties properties;

  /**
   * Creates the S3 client.
   *
   * @return configured {@link S3Client}
   */
  @Bean
  @ConditionalOnMissingBean(S3Client.class)
  public S3Client s3Client() {
    return applyCommonSettings(S3Client.builder()).build();
  }

  /**
   * Creates the presigner used to issue short-lived upload URLs.
   *
   * @return configured {@link S3Presigner}
   */
  @Bean
  @ConditionalOnMissingBean(S3Presigner.class)
  public S3Presigner s3Presigner() {
    S3Presigner.Builder builder =
        S3Presigner.builder()
            .region(Region.of(properties.getRegion()))
            .credentialsProvider(resolveCredentials());
    if (StringUtils.isNotBlank(properties.getEndpoint())) {
      builder.endpointOverride(URI.create(properties.getEndpoint()));
    }
    builder.serviceConfiguration(pathStyleConfiguration());
    return builder.build();
  }

  private S3ClientBuilder applyCommonSettings(S3ClientBuilder builder) {
    builder
        .region(Region.of(properties.getRegion()))
        .credentialsProvider(resolveCredentials())
        .httpClientBuilder(UrlConnectionHttpClient.builder());
    if (StringUtils.isNotBlank(properties.getEndpoint())) {
      builder.endpointOverride(URI.create(properties.getEndpoint()));
    }
    if (isPathStyleEnabled()) {
      builder.forcePathStyle(true);
    }
    return builder;
  }

  private S3Configuration pathStyleConfiguration() {
    return S3Configuration.builder().pathStyleAccessEnabled(isPathStyleEnabled()).build();
  }

  private boolean isPathStyleEnabled() {
    return properties.isForcePathStyle() || StringUtils.isNotBlank(properties.getEndpoint());
  }

  private AwsCredentialsProvider resolveCredentials() {
    if (StringUtils.isAnyBlank(properties.getAccessKey(), properties.getSecretKey())) {
      return DefaultCredentialsProvider.builder().build();
    }
    return StaticCredentialsProvider.create(
        AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey()));
  }
}

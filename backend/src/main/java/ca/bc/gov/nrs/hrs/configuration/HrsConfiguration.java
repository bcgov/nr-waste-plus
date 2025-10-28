package ca.bc.gov.nrs.hrs.configuration;

import java.time.Duration;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;
import org.springframework.stereotype.Component;

/**
 * Application configuration properties for the HRS backend bound from properties with prefix
 * {@code ca.bc.gov.nrs}.
 *
 * <p>This class groups external API addresses and frontend-related settings
 * (including CORS configuration). Instances are populated automatically by Spring Boot's
 * {@code @ConfigurationProperties} mechanism.</p>
 *
 * @since 1.0.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Component
@ConfigurationProperties("ca.bc.gov.nrs")
public class HrsConfiguration {

  /**
   * Configuration for the Forest Client external API (address and API key).
   */
  @NestedConfigurationProperty
  private ExternalApiAddress forestClientApi;

  /**
   * Configuration for legacy backend APIs (address and optional key).
   */
  @NestedConfigurationProperty
  private ExternalApiAddress legacyApi;

  /**
   * Frontend-related configuration containing the base URL and CORS settings.
   */
  @NestedConfigurationProperty
  private FrontEndConfiguration frontend;

  /**
   * External API address configuration.
   *
   * <p>Holds the remote service base URL and an optional API key used to
   * authenticate requests.</p>
   */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ExternalApiAddress {

    /**
     * Base URL of the external service (for example, {@code https://api.example.com}).
     */
    private String address;

    /**
     * API key or token to authenticate calls to the external service.
     */
    private String key;
  }

  /**
   * The Front end configuration.
   *
   * <p>Contains the configured frontend origin(s) and nested CORS configuration
   * used by the server to allow cross-origin requests from the front-end application.</p>
   */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class FrontEndConfiguration {

    /**
     * Frontend base URL(s). Can be a single URL or a comma-separated list of origins when multiple
     * frontends are used.
     */
    private String url;

    /**
     * Nested CORS configuration for the frontend.
     */
    @NestedConfigurationProperty
    private FrontEndCorsConfiguration cors;

  }

  /**
   * The Front end cors configuration.
   *
   * <p>This class contains the allowed headers, allowed HTTP methods and the
   * max age for preflight responses. Values are bound from configuration and are used by the
   * application's CORS setup.</p>
   */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class FrontEndCorsConfiguration {

    /**
     * List of allowed request headers for CORS (for example,
     * {@code ["Content-Type", "Authorization"]}).
     */
    private List<String> headers;

    /**
     * List of allowed HTTP methods for CORS (for example, {@code ["GET","POST"]}).
     */
    private List<String> methods;

    /**
     * The duration for which preflight responses may be cached by the client.
     */
    private Duration age;
  }

}

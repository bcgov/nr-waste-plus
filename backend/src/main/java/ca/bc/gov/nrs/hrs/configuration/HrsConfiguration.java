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
   * Cognito-specific configuration (userInfo URI and identity TTL).
   */
  @NestedConfigurationProperty
  private CognitoConfiguration cognito;

  /**
   * Identity hydration configuration (which paths trigger hydration).
   */
  @NestedConfigurationProperty
  private HydrationConfiguration hydration;

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

    /**
     * List of additional allowed origins for CORS, configured separately from the
     * {@code url} property in {@link FrontEndConfiguration}. These origins are used in addition
     * to the configured frontend URL(s) when setting up CORS mappings for API endpoints.
     */
    private List<String> origins;
  }

  /**
   * Cognito configuration.
   *
   * <p>Holds the Cognito userInfo endpoint URI and the TTL after which a
   * persisted identity record is considered stale and must be refreshed.</p>
   */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class CognitoConfiguration {

    /**
     * Full URL of the Cognito {@code /oauth2/userInfo} endpoint.
     * Defaults to the standard Cognito path derived from region and pool env vars.
     */
    private String userinfoUri;

    /**
     * How long a locally persisted identity is considered fresh before
     * a Cognito refresh is triggered. Defaults to 24 hours.
     */
    @Builder.Default
    private Duration identityTtl = Duration.ofHours(24);
  }

  /**
   * Identity hydration configuration.
   *
   * <p>Defines the list of request paths that will trigger user identity
   * hydration via the {@code UserIdentityHydrationFilter}.</p>
   */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class HydrationConfiguration {

    /**
     * List of path prefixes for which identity hydration is performed.
     * Any request whose URI starts with one of these values will be hydrated.
     */
    @Builder.Default
    private List<String> paths = List.of("/api/users/preferences");
  }

  /**
   * CDOGS backend configuration properties.
   *
   * <p>This nested configuration holds the CDOGS service URI, token endpoint,
   * and OAuth2 client credentials. Credentials are provided via environment
   * variables and must never appear in configuration files.</p>
   */
  @NestedConfigurationProperty
  private CdogsConfiguration cdogs;

  /**
   * The CDOGS configuration.
   *
   * <p>Contains the CDOGS service address, token URL, and OAuth2 client
   * credentials used for authentication.</p>
   */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class CdogsConfiguration {

    /**
     * Base URL of the CDOGS service.
     * Default: {@code https://cdogs.api.gov.bc.ca/api/v2}
     */
    private String uri;

    /**
     * Token endpoint URL for OAuth2 authentication.
     * Default: {@code https://loginproxy.gov.bc.ca/auth/realms/comsvcauth/protocol/openid-connect/token}
     */
    private String tokenUrl;

    /**
     * OAuth2 client ID for authentication.
     * Default: {@code placeholder}
     */
    private String clientId;

    /**
     * OAuth2 client secret for authentication.
     * Default: {@code placeholder}
     */
    private String clientSecret;

    /**
     * Expected token lifetime in seconds. Default: 300 (5 minutes).
     */
    @Builder.Default
    private long expiresIn = 300;
  }

}

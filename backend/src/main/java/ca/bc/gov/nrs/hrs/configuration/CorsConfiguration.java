package ca.bc.gov.nrs.hrs.configuration;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC Cross-Origin Resource Sharing (CORS) configuration.
 *
 * <p>This configuration reads the frontend URL(s) and CORS policy from
 * {@link HrsConfiguration} and registers CORS mappings for application API endpoints and the
 * actuator endpoints.</p>
 *
 * <p>Behavior summary:</p>
 * <ul>
 *   <li><b>/api/**</b> - allowed origins come from the configured frontend URL(s);
 *       allowed methods, headers, exposed headers, max age and credentials are
 *       taken from the configured CORS settings (credentials are allowed).</li>
 *   <li><b>/actuator/**</b> - allows any origin for GET requests and does not
 *       allow credentials.</li>
 * </ul>
 *
 * @since 1.0.0
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class CorsConfiguration implements WebMvcConfigurer {

  private final HrsConfiguration configuration;

  /**
   * Configure CORS mappings used by Spring MVC.
   *
   * <p>The method reads the frontend URL from {@code configuration.getFrontend().getUrl()}.
   * If the URL contains commas it will be split into multiple allowed origins. The resulting list
   * is applied to the {@code /api/**} mapping via
   * {@link
   * org.springframework.web.servlet.config.annotation.CorsRegistration#allowedOriginPatterns(String...)
   * allowedOriginPatterns}.
   * </p>
   *
   * <p>Note: actuator endpoints are registered separately to allow any origin
   * for safe read-only GET access.</p>
   *
   * @param registry the {@link CorsRegistry} to configure; must not be null
   */
  @Override
  public void addCorsMappings(@NonNull CorsRegistry registry) {
    var frontendConfig = configuration.getFrontend();
    var cors = frontendConfig.getCors();
    String origins = frontendConfig.getUrl();
    List<String> allowedOrigins = new ArrayList<>();

    if (StringUtils.isNotBlank(origins) && origins.contains(",")) {
      allowedOrigins.addAll(Arrays.asList(origins.split(",")));
    } else {
      allowedOrigins.add(origins);
    }

    log.info("Allowed origins: {} {}", allowedOrigins, allowedOrigins.toArray(new String[0]));

    registry
        .addMapping("/api/**")
        .allowedOriginPatterns(allowedOrigins.toArray(new String[0]))
        .allowedMethods(cors.getMethods().toArray(new String[0]))
        .allowedHeaders(cors.getHeaders().toArray(new String[0]))
        .exposedHeaders(cors.getHeaders().toArray(new String[0]))
        .maxAge(cors.getAge().getSeconds())
        .allowCredentials(true);

    registry.addMapping("/actuator/**")
        .allowedOrigins("*")
        .allowedMethods("GET")
        .allowedHeaders("*")
        .allowCredentials(false);

    WebMvcConfigurer.super.addCorsMappings(registry);
  }
}

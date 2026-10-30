package ca.bc.gov.nrs.hrs.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

@DisplayName("CORS configuration")
class CorsConfigurationTest {

  @Test
  @DisplayName("configures allowed headers including Idempotency-Key")
  void shouldIncludeIdempotencyKeyInAllowedHeaders() {
    HrsConfiguration hrsConfig = new HrsConfiguration();
    HrsConfiguration.FrontEndConfiguration frontend = new HrsConfiguration.FrontEndConfiguration();
    frontend.setUrl("http://localhost:3000");

    HrsConfiguration.FrontEndCorsConfiguration cors =
        new HrsConfiguration.FrontEndCorsConfiguration();
    cors.setHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
    cors.setMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    cors.setAge(Duration.ofMinutes(5));
    frontend.setCors(cors);
    hrsConfig.setFrontend(frontend);

    CorsConfiguration corsConfiguration = new CorsConfiguration(hrsConfig);
    CorsRegistry registry = new CorsRegistry();
    corsConfiguration.addCorsMappings(registry);

    assertThat(cors.getHeaders()).contains("Idempotency-Key");
  }
}


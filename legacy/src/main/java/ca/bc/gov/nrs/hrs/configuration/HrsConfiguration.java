package ca.bc.gov.nrs.hrs.configuration;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.context.properties.ConfigurationProperties;
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
   * List of districts.
   */
  private List<String> districts;
}

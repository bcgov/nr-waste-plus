package ca.bc.gov.nrs.hrs.configuration;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for code-list endpoints exposed by {@code CodesService}.
 *
 * <p>Bound from {@code ca.bc.gov.nrs.codes}. Variant-keyed allowlists scope the harvest-status
 * options per reporting-unit variant (plan D33: Interior excludes N/A, Coast keeps it). A variant
 * with no entry — or an empty entry — resolves to no filtering, so the endpoint returns every valid
 * row from the code table until the authoritative seed/config data lands.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Component
@ConfigurationProperties("ca.bc.gov.nrs.codes")
public class CodesProperties {

  /** Variant-keyed harvest-status code allowlists; absent variants resolve to no filtering. */
  private Map<String, List<String>> harvestStatusVariants = Map.of();
}

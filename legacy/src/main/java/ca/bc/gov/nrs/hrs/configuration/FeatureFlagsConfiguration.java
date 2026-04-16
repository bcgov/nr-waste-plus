package ca.bc.gov.nrs.hrs.configuration;

import jakarta.annotation.PostConstruct;
import java.util.Collections;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Application-level feature flags loaded from the {@code features} configuration prefix.
 *
 * <p>Flags are defined as a flat map of {@code String → Boolean} in {@code application.yml}:
 *
 * <pre>{@code
 * features:
 *   flags:
 *     multi-address: true
 *     staff-match: false
 * }</pre>
 *
 * <p>Usage: inject {@code FeatureFlags} and call {@link #isEnabled(String)}:
 *
 * <pre>{@code
 * if (featureFlags.isEnabled("multi-address")) { … }
 * }</pre>
 *
 * Flags that are not defined default to {@code false} (disabled).
 *
 * @since 1.0.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Component
@ConfigurationProperties("features")
@Slf4j
public class FeatureFlagsConfiguration {

  /**
   * Map of feature flag names to their enabled/disabled state.
   */
  @Builder.Default
  private Map<String, Boolean> flags = Collections.emptyMap();

  /**
   * Returns whether the given feature flag is enabled.
   *
   * @param flag the flag name (must match the key in {@code features.flags.*})
   * @return {@code true} if the flag exists and is set to {@code true}; {@code false} otherwise
   */
  public boolean isEnabled(String flag) {
    return Boolean.TRUE.equals(flags.get(flag));
  }

  /**
   * Logs all configured feature flags at startup.
   */
  @PostConstruct
  void logFlags() {
    if (flags == null || flags.isEmpty()) {
      log.info("No feature flags configured");
      return;
    }
    flags.forEach((name, enabled) ->
        log.info("Feature flag '{}' is {}", name, Boolean.TRUE.equals(enabled) ? "ENABLED" : "DISABLED")
    );
  }
}


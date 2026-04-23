package ca.bc.gov.nrs.hrs.configuration;

import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.env.Environment;
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
 * <p>Usage: inject {@code FeatureFlagsConfiguration} and call {@link #isEnabled(String)}:
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

  private static final String FEATURE_FLAG_EVALUATION_METRIC = "hrs.feature.flag.evaluations";

  private static final String PROD_PROFILE = "prod";

  private static final String PRODUCTION_PROFILE = "production";

  /**
   * Map of feature flag names to their enabled/disabled state.
   */
  @Builder.Default
  private Map<String, Boolean> flags = Collections.emptyMap();

  @Builder.Default
  private Map<String, Counter> evaluationCounters = new ConcurrentHashMap<>();

  @Autowired(required = false)
  private MeterRegistry meterRegistry;

  @Autowired(required = false)
  private Environment environment;

  /**
   * Returns whether the given feature flag is enabled.
   *
   * <p>Prefer {@link #isEnabled(FeatureFlag)} for production callers; this overload
   * is retained for configuration-mechanism tests and framework use.
   *
   * @param flag the flag name (must match the key in {@code features.flags.*})
   * @return {@code true} if the flag exists and is set to {@code true}; {@code false} otherwise
   */
  public boolean isEnabled(String flag) {
    boolean enabled = Boolean.TRUE.equals(flags.get(flag));
    recordEvaluation(flag, enabled);
    return enabled;
  }

  /**
   * Returns whether the given feature flag is enabled.
   *
   * <p>Prefer this overload over {@link #isEnabled(String)} — the {@link FeatureFlag} enum
   * provides compile-time discoverability of all known flags and prevents silent typos.
   *
   * @param flag the flag to evaluate
   * @return {@code true} if the flag exists and is set to {@code true}; {@code false} otherwise
   * @see FeatureFlag
   */
  public boolean isEnabled(FeatureFlag flag) {
    return isEnabled(flag.getKey());
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

    long enabledCount = flags.values().stream().filter(Boolean.TRUE::equals).count();
    long disabledCount = flags.size() - enabledCount;

    if (isProductionProfileActive()) {
      log.info(
          "Feature flags configured. total={}, enabled={}, disabled={}",
          flags.size(),
          enabledCount,
          disabledCount
      );
      flags.forEach((name, enabled) ->
          log.debug("Feature flag '{}' is {}", name, Boolean.TRUE.equals(enabled) ? "ENABLED" : "DISABLED")
      );
      return;
    }

    flags.forEach((name, enabled) ->
        log.info("Feature flag '{}' is {}", name, Boolean.TRUE.equals(enabled) ? "ENABLED" : "DISABLED")
    );
  }

  private void recordEvaluation(String flag, boolean enabled) {
    if (meterRegistry == null) {
      return;
    }

    String flagName = flag == null ? "<null>" : flag;
    String valueTag = Boolean.toString(enabled);
    String cacheKey = flagName + ':' + valueTag;

    Counter counter = evaluationCounters.computeIfAbsent(cacheKey, ignored ->
        Counter.builder(FEATURE_FLAG_EVALUATION_METRIC)
            .description("Count of feature flag evaluations by flag and value")
            .tag("flag", flagName)
            .tag("value", valueTag)
            .register(meterRegistry)
    );
    counter.increment();
  }

  private boolean isProductionProfileActive() {
    if (environment == null) {
      return false;
    }

    return Arrays.stream(environment.getActiveProfiles())
        .map(String::toLowerCase)
        .anyMatch(profile -> PROD_PROFILE.equals(profile) || PRODUCTION_PROFILE.equals(profile));
  }
}


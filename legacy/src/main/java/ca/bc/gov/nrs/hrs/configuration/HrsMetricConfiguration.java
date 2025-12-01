package ca.bc.gov.nrs.hrs.configuration;

import io.micrometer.core.aop.TimedAspect;
import io.micrometer.core.instrument.Meter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.config.MeterFilter;
import io.micrometer.core.instrument.distribution.DistributionStatisticConfig;
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.micrometer.metrics.autoconfigure.MeterRegistryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for application metrics and Micrometer integration.
 *
 * <p>This class registers common metric-related beans such as a {@link TimedAspect}
 * for AOP-based @Timed support, common tags applied to all meters, and Prometheus registry
 * customizations. It reads application metadata (version, name, zone) from properties and applies
 * them as common tags to the meter registry.
 * </p>
 *
 * @since 1.0.0
 */
@Configuration
public class HrsMetricConfiguration {

  /**
   * Application version injected from property {@code info.app.version}.
   */
  @Value("${info.app.version}")
  private String appVersion;

  /**
   * Application name injected from property {@code info.app.name}.
   */
  @Value("${info.app.name}")
  private String appName;

  /**
   * Deployment zone injected from property {@code info.app.zone}.
   */
  @Value("${info.app.zone}")
  private String appZone;

  /**
   * Registers a {@link TimedAspect} that enables Micrometer's {@code @Timed} annotation support via
   * AOP.
   *
   * @param registry the application's {@link MeterRegistry}
   * @return a configured {@link TimedAspect}
   */
  @Bean
  public TimedAspect timedAspect(MeterRegistry registry) {
    return new TimedAspect(registry);
  }

  /**
   * Provides common tags and meter filters to be applied to all meters.
   *
   * <p>The returned {@link MeterRegistryCustomizer} adds the application
   * metadata (version, app name and zone) as common tags and registers additional
   * {@link MeterFilter}s for ignoring noisy tags and configuring distribution statistics
   * (percentiles and service-level objectives).</p>
   *
   * @return a {@link MeterRegistryCustomizer} that customizes the provided registry
   */
  @Bean
  public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
    return registry -> registry.config()
        .commonTags(
            "version", appVersion,
            "app", appName,
            "zone", appZone
        )
        .meterFilter(ignoreTag())
        .meterFilter(distribution());
  }

  /**
   * Customizer for Prometheus-specific registry configuration.
   *
   * <p>Currently returns the registry config function but can be extended to
   * further customize Prometheus-specific behavior if required.</p>
   *
   * @return a {@link MeterRegistryCustomizer} for {@link PrometheusMeterRegistry}
   */
  @Bean
  public MeterRegistryCustomizer<PrometheusMeterRegistry> prometheusConfiguration() {
    return MeterRegistry::config;
  }

  /**
   * A {@link MeterFilter} that ignores the tag named {@code type}.
   *
   * @return a {@link MeterFilter} that ignores the {@code type} tag
   */
  public MeterFilter ignoreTag() {
    return MeterFilter.ignoreTags("type");
  }

  /**
   * Creates a {@link MeterFilter} that configures distribution statistics for timers and summaries,
   * including percentiles and SLO histogram service-level objectives.
   *
   * <p>The returned filter merges its configuration with any existing
   * configuration on the meter.</p>
   *
   * @return a {@link MeterFilter} that applies percentile and SLO settings
   */
  public MeterFilter distribution() {
    return new MeterFilter() {

      @Override
      public DistributionStatisticConfig configure(Meter.Id id,
          DistributionStatisticConfig config) {
        return DistributionStatisticConfig
            .builder()
            .percentiles(0.5, 0.95, 0.99)
            .serviceLevelObjectives(
                Duration.ofMillis(100).toNanos(),
                Duration.ofMillis(250).toNanos(),
                Duration.ofMillis(500).toNanos(),
                Duration.ofSeconds(1).toNanos(),
                Duration.ofSeconds(2).toNanos(),
                Duration.ofSeconds(5).toNanos(),
                Duration.ofSeconds(15).toNanos(),
                Duration.ofSeconds(30).toNanos(),
                Duration.ofMinutes(1).toNanos()
            )
            .build()
            .merge(config);
      }
    };
  }

}

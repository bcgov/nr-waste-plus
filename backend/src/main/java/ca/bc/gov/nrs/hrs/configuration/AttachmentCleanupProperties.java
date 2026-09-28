package ca.bc.gov.nrs.hrs.configuration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration properties for scheduled cleanup of abandoned attachment upload intents.
 * Bound from {@code ca.bc.gov.nrs.attachment.cleanup}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Component
@Validated
@ConfigurationProperties("ca.bc.gov.nrs.attachment.cleanup")
public class AttachmentCleanupProperties {

  /**
   * Time-to-live after which an UPLOADING intent is considered abandoned and eligible for cleanup.
   */
  @NotNull
  @Builder.Default
  private Duration ttl = Duration.ofHours(24);

  /** Whether the scheduled cleanup job is enabled. */
  @Builder.Default
  private boolean enabled = true;

  /** Cron schedule for the cleanup job. Defaults to hourly at minute 0. */
  @NotBlank
  @Builder.Default
  private String cron = "0 0 * * * *";
}

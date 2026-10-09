package ca.bc.gov.nrs.hrs.configuration;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for block-creation rules keyed by sampling code.
 *
 * <p>Bound from {@code ca.bc.gov.nrs.block-rules}. A reporting unit whose sampling code has no
 * entry resolves to no rule, which the frontend reads as "block creation not shipped for this
 * sampling type".
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Component
@ConfigurationProperties("ca.bc.gov.nrs.block-rules")
public class BlockRulesProperties {

  /** Sampling-code-keyed block rules; absent codes resolve to no rule. */
  private Map<String, SamplingBlockRule> sampling;

  /**
   * Rule for a single sampling type.
   *
   * @param maxBlocks the maximum number of blocks allowed
   * @param blockType the block type to create, e.g. {@code DISTRICT_AVERAGE}
   */
  public record SamplingBlockRule(int maxBlocks, String blockType) {}
}

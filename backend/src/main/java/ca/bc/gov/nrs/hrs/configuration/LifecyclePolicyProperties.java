package ca.bc.gov.nrs.hrs.configuration;

import ca.bc.gov.nrs.hrs.dto.base.Role;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties holding the data-driven lifecycle transition matrix and per-role edit
 * permissions, bound from {@code ca.bc.gov.nrs.lifecycle}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Component
@ConfigurationProperties("ca.bc.gov.nrs.lifecycle")
public class LifecyclePolicyProperties {

  /** Ordered list of transition edges in the state-machine matrix. */
  private List<TransitionRule> transitions = new ArrayList<>();

  /** States in which each role is allowed to edit (save data). */
  private Map<Role, Set<String>> editableStates = new EnumMap<>(Role.class);

  /** Actor type that can trigger a transition. */
  public enum ActorType {
    USER,
    SYSTEM
  }

  /**
   * Single row in the lifecycle transition matrix.
   *
   * @param fromState source state
   * @param event event code
   * @param toState resulting state
   * @param label human-readable label for UI display
   * @param roles roles allowed to trigger the event (empty for SYSTEM events)
   * @param actor USER or SYSTEM
   * @param condition precondition key (NONE, NO_HOLD, HOLD_REQUIRED, AUTO_APPROVE_ELAPSED,
   *     BILLING_DELAY_ELAPSED)
   * @param commentRequired whether a non-blank comment is required
   * @param confirmationRequired whether the UI should ask for confirmation
   * @param externalStep optional external step name (e.g. HBS_INVOICE_POST)
   */
  public record TransitionRule(
      String fromState,
      String event,
      String toState,
      String label,
      Set<Role> roles,
      ActorType actor,
      String condition,
      boolean commentRequired,
      boolean confirmationRequired,
      String externalStep) {}
}

package ca.bc.gov.nrs.hrs.service.lifecycle;

import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job evaluating lifecycle timer boundaries ({@code AUTO_APPROVE_MONTHS} and {@code
 * BILLING_DELAY_MONTHS}) and triggering {@code SYSTEM} transitions via {@link
 * LifecycleEventService}.
 */
@Component
@ConditionalOnProperty(
    prefix = "ca.bc.gov.nrs.lifecycle.timer",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
@Observed
public class LifecycleTimerJob {

  private static final String STATUS_CODE_SUBMITTED = "SUB";
  private static final String STATUS_CODE_SUBMISSION_APPROVED = "APP";

  private final BlockRepository blockRepository;
  private final LifecycleEventService lifecycleEventService;

  /**
   * Evaluates all live blocks in {@code SUBMITTED} and {@code SUBMISSION_APPROVED} states and
   * applies eligible {@code SYSTEM} timer transitions.
   *
   * @return total number of blocks transitioned
   */
  @Scheduled(cron = "${ca.bc.gov.nrs.lifecycle.timer.cron:0 0 2 * * *}")
  @NewSpan
  public int evaluateLifecycleTimers() {
    int transitioned = 0;

    List<BlockEntity> submittedBlocks =
        blockRepository.findByStatusCodeAndDeletedFalse(STATUS_CODE_SUBMITTED);
    for (BlockEntity block : submittedBlocks) {
      try {
        if (lifecycleEventService.recordSystemBlockLifecycleEvent(
                block.getId(), TransitionPolicyService.EVENT_AUTO_APPROVE)
            != null) {
          transitioned++;
        }
      } catch (Exception ex) {
        log.error(
            "Failed to evaluate AUTO_APPROVE timer for block {}", block.getId(), ex);
      }
    }

    List<BlockEntity> approvedBlocks =
        blockRepository.findByStatusCodeAndDeletedFalse(STATUS_CODE_SUBMISSION_APPROVED);
    for (BlockEntity block : approvedBlocks) {
      try {
        if (lifecycleEventService.recordSystemBlockLifecycleEvent(
                block.getId(), TransitionPolicyService.EVENT_AUTO_APPROVE_BILLING)
            != null) {
          transitioned++;
        }
      } catch (Exception ex) {
        log.error(
            "Failed to evaluate AUTO_APPROVE_BILLING timer for block {}", block.getId(), ex);
      }
    }

    if (transitioned > 0) {
      log.info("Lifecycle timer job transitioned {} block(s).", transitioned);
    }
    return transitioned;
  }
}

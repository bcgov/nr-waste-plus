package ca.bc.gov.nrs.hrs.service.lifecycle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventResponseDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Lifecycle Timer Job")
class LifecycleTimerJobTest {

  @Mock
  private BlockRepository blockRepository;

  @Mock
  private LifecycleEventService lifecycleEventService;

  @InjectMocks
  private LifecycleTimerJob timerJob;

  @Test
  @DisplayName("Evaluates SUBMITTED and SUBMISSION_APPROVED blocks and counts transitions")
  void evaluateLifecycleTimers_countsSuccessfulTransitions() {
    BlockEntity sub1 = new BlockEntity();
    sub1.setId(1L);
    BlockEntity sub2 = new BlockEntity();
    sub2.setId(2L);
    BlockEntity app1 = new BlockEntity();
    app1.setId(3L);

    when(blockRepository.findByStatusCodeAndDeletedFalse("SUB")).thenReturn(List.of(sub1, sub2));
    when(blockRepository.findByStatusCodeAndDeletedFalse("APP")).thenReturn(List.of(app1));

    when(lifecycleEventService.recordSystemBlockLifecycleEvent(
            1L, TransitionPolicyService.EVENT_AUTO_APPROVE))
        .thenReturn(
            new LifecycleEventResponseDto(
                10L, 1L, "SUBMITTED", "SUBMISSION_APPROVED", "AUTO_APPROVE", 2L, Instant.now()));
    when(lifecycleEventService.recordSystemBlockLifecycleEvent(
            2L, TransitionPolicyService.EVENT_AUTO_APPROVE))
        .thenReturn(null);
    when(lifecycleEventService.recordSystemBlockLifecycleEvent(
            3L, TransitionPolicyService.EVENT_AUTO_APPROVE_BILLING))
        .thenReturn(null);

    int count = timerJob.evaluateLifecycleTimers();
    assertThat(count).isEqualTo(1);
  }
}

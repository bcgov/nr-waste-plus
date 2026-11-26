package ca.bc.gov.nrs.hrs.service.lifecycle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.entity.block.LifecycleSettingEntity;
import ca.bc.gov.nrs.hrs.repository.block.LifecycleSettingRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Lifecycle Setting Service")
class LifecycleSettingServiceTest {

  @Mock
  private LifecycleSettingRepository repository;

  @InjectMocks
  private LifecycleSettingService service;

  @Test
  @DisplayName("Returns configured integer values when present")
  void returnsConfiguredValues() {
    LifecycleSettingEntity autoApprove = new LifecycleSettingEntity();
    autoApprove.setSettingKey(LifecycleSettingService.KEY_AUTO_APPROVE_MONTHS);
    autoApprove.setSettingValue("6");
    when(repository.findBySettingKey(LifecycleSettingService.KEY_AUTO_APPROVE_MONTHS))
        .thenReturn(Optional.of(autoApprove));

    LifecycleSettingEntity billingDelay = new LifecycleSettingEntity();
    billingDelay.setSettingKey(LifecycleSettingService.KEY_BILLING_DELAY_MONTHS);
    billingDelay.setSettingValue("3");
    when(repository.findBySettingKey(LifecycleSettingService.KEY_BILLING_DELAY_MONTHS))
        .thenReturn(Optional.of(billingDelay));

    assertThat(service.getAutoApproveMonths()).isEqualTo(6);
    assertThat(service.getBillingDelayMonths()).isEqualTo(3);
  }

  @Test
  @DisplayName("Falls back to defaults when missing or invalid")
  void fallsBackToDefaults() {
    when(repository.findBySettingKey(LifecycleSettingService.KEY_AUTO_APPROVE_MONTHS))
        .thenReturn(Optional.empty());

    LifecycleSettingEntity bad = new LifecycleSettingEntity();
    bad.setSettingKey(LifecycleSettingService.KEY_BILLING_DELAY_MONTHS);
    bad.setSettingValue("not-a-number");
    when(repository.findBySettingKey(LifecycleSettingService.KEY_BILLING_DELAY_MONTHS))
        .thenReturn(Optional.of(bad));

    assertThat(service.getAutoApproveMonths())
        .isEqualTo(LifecycleSettingService.DEFAULT_AUTO_APPROVE_MONTHS);
    assertThat(service.getBillingDelayMonths())
        .isEqualTo(LifecycleSettingService.DEFAULT_BILLING_DELAY_MONTHS);
  }
}

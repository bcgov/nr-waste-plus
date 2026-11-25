package ca.bc.gov.nrs.hrs.service.lifecycle;

import ca.bc.gov.nrs.hrs.entity.block.LifecycleSettingEntity;
import ca.bc.gov.nrs.hrs.repository.block.LifecycleSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads configurable lifecycle timer settings from {@code wasteplus.lifecycle_setting} with safe
 * defaults when a setting row is absent or unparseable.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LifecycleSettingService {

  public static final String KEY_AUTO_APPROVE_MONTHS = "AUTO_APPROVE_MONTHS";
  public static final String KEY_BILLING_DELAY_MONTHS = "BILLING_DELAY_MONTHS";

  public static final int DEFAULT_AUTO_APPROVE_MONTHS = 12;
  public static final int DEFAULT_BILLING_DELAY_MONTHS = 1;

  private final LifecycleSettingRepository lifecycleSettingRepository;

  /** Returns the configured number of months before a submitted block auto-approves. */
  @Transactional(readOnly = true)
  public int getAutoApproveMonths() {
    return getIntSetting(KEY_AUTO_APPROVE_MONTHS, DEFAULT_AUTO_APPROVE_MONTHS);
  }

  /** Returns the configured number of months before an approved block auto-bills. */
  @Transactional(readOnly = true)
  public int getBillingDelayMonths() {
    return getIntSetting(KEY_BILLING_DELAY_MONTHS, DEFAULT_BILLING_DELAY_MONTHS);
  }

  private int getIntSetting(String key, int defaultValue) {
    return lifecycleSettingRepository
        .findBySettingKey(key)
        .map(LifecycleSettingEntity::getSettingValue)
        .map(value -> parsePositiveOrZeroInt(key, value, defaultValue))
        .orElse(defaultValue);
  }

  private int parsePositiveOrZeroInt(String key, String rawValue, int defaultValue) {
    if (rawValue == null || rawValue.isBlank()) {
      return defaultValue;
    }
    try {
      int parsed = Integer.parseInt(rawValue.trim());
      if (parsed < 0) {
        log.warn(
            "Lifecycle setting '{}' has negative value '{}'; falling back to default {}",
            key,
            rawValue,
            defaultValue);
        return defaultValue;
      }
      return parsed;
    } catch (NumberFormatException ex) {
      log.warn(
          "Lifecycle setting '{}' has non-integer value '{}'; falling back to default {}",
          key,
          rawValue,
          defaultValue);
      return defaultValue;
    }
  }
}

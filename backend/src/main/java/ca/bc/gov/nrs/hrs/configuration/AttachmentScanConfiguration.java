package ca.bc.gov.nrs.hrs.configuration;

import ca.bc.gov.nrs.hrs.provider.scanner.AttachmentScanner;
import ca.bc.gov.nrs.hrs.provider.scanner.DefaultAttachmentScanner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration providing the platform {@link AttachmentScanner} bean.
 *
 * <p>Registers a {@link DefaultAttachmentScanner} fallback bean if no custom or concrete platform
 * scanner is defined elsewhere in the context.
 */
@Configuration
public class AttachmentScanConfiguration {

  /**
   * Provides the default fallback {@link AttachmentScanner} when no other scanner is present.
   *
   * @return default fallback scanner
   */
  @Bean
  @ConditionalOnMissingBean(AttachmentScanner.class)
  public AttachmentScanner attachmentScanner() {
    return new DefaultAttachmentScanner();
  }
}

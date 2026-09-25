package ca.bc.gov.nrs.hrs.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import ca.bc.gov.nrs.hrs.provider.scanner.AttachmentScanner;
import ca.bc.gov.nrs.hrs.provider.scanner.DefaultAttachmentScanner;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

@DisplayName("Unit Test | AttachmentScanConfiguration")
class AttachmentScanConfigurationTest {

  private final ApplicationContextRunner contextRunner =
      new ApplicationContextRunner().withUserConfiguration(AttachmentScanConfiguration.class);

  @Test
  @DisplayName("provides DefaultAttachmentScanner when no other scanner is defined")
  void providesDefaultScannerWhenNonePresent() {
    contextRunner.run(
        context -> {
          assertThat(context).hasSingleBean(AttachmentScanner.class);
          assertThat(context.getBean(AttachmentScanner.class))
              .isInstanceOf(DefaultAttachmentScanner.class);
        });
  }

  @Test
  @DisplayName("backs off when custom AttachmentScanner bean is present")
  void backsOffWhenCustomScannerPresent() {
    AttachmentScanner customScanner = mock(AttachmentScanner.class);
    contextRunner
        .withBean("customAttachmentScanner", AttachmentScanner.class, () -> customScanner)
        .run(
            context -> {
              assertThat(context).hasSingleBean(AttachmentScanner.class);
              assertThat(context.getBean(AttachmentScanner.class)).isSameAs(customScanner);
            });
  }
}

package ca.bc.gov.nrs.hrs.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.assertj.core.api.InstanceOfAssertFactories;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.autoconfigure.info.InfoContributorAutoConfiguration;
import org.springframework.boot.actuate.autoconfigure.info.InfoEndpointAutoConfiguration;
import org.springframework.boot.actuate.info.InfoEndpoint;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class InfoEndpointConfigurationTest {

  private final ApplicationContextRunner contextRunner =
      new ApplicationContextRunner()
          .withInitializer(new ConfigDataApplicationContextInitializer())
          .withConfiguration(
              AutoConfigurations.of(
                  InfoContributorAutoConfiguration.class, InfoEndpointAutoConfiguration.class));

  @Test
  void infoEndpointIncludesFilteredApplicationMetadata() {
    contextRunner.run(
        context -> {
          assertThat(context).hasNotFailed();
          assertThat(context.getEnvironment().getProperty("management.info.env.enabled"))
              .isEqualTo("true");

          Map<String, Object> info = context.getBean(InfoEndpoint.class).info();

          Map<?, ?> appInfo =
              assertThat(info)
                  .extractingByKey("app", InstanceOfAssertFactories.MAP)
                  .containsKeys("version", "build", "commit")
                  .actual();
          assertThat(appInfo.get("version")).asString().isNotBlank();
          assertThat(appInfo.get("build")).asString().isNotBlank();
          assertThat(appInfo.get("commit")).asString().isNotBlank();
        });
  }
}

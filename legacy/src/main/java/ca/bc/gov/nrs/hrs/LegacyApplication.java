package ca.bc.gov.nrs.hrs;

import static org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

/**
 * Bootstrap class for the legacy HRS Spring Boot application.
 *
 * <p>This class contains the application's main method and configuration-level annotations.
 * AspectJ proxying is enabled and Spring Data Web support is configured to serialize pages via
 * DTOs (see {@code VIA_DTO}).</p>
 *
 * <p>Keep this class small: it is only intended as the application entrypoint and to hold
 * a minimal set of framework annotations.</p>
 */
@SpringBootApplication
@EnableAspectJAutoProxy(proxyTargetClass = true)
@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)
public class LegacyApplication {

  /**
   * Application entry point used by the JVM to start the Spring Boot application.
   *
   * @param args command-line arguments passed to the application (ignored by the bootstrap)
   */
  public static void main(String[] args) {
    SpringApplication.run(LegacyApplication.class, args);
  }

}

package ca.bc.gov.nrs.hrs;

import static org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

/**
 * Main Spring Boot application bootstrap for the HRS backend.
 *
 * <p>This class serves as the application's entry point and enables a couple of
 * framework features via annotations:</p>
 *
 * <ul>
 *   <li>AspectJ auto-proxying ({@link EnableAspectJAutoProxy}) to support AOP-based
 *       concerns such as logging or transactions.</li>
 *   <li>Spring Data web support ({@link EnableSpringDataWebSupport}) configured to
 *       serialize page responses via DTOs (see {@code VIA_DTO}).</li>
 * </ul>
 *
 * <p>
 * The class intentionally contains only the {@code main} method so that component
 * scanning starts from this package.</p>
 *
 * @since 1.0.0
 */
@SpringBootApplication
@EnableAspectJAutoProxy(proxyTargetClass = true)
@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)
public class BackendApplication {

  /**
   * Application entry point.
   *
   * <p>Bootstraps the Spring application context by delegating to
   * {@link SpringApplication#run(Class, String[]) SpringApplication.run}.
   *
   * @param args command line arguments passed to the application (may be empty)
   */
  public static void main(String[] args) {
    SpringApplication.run(BackendApplication.class, args);
  }

}

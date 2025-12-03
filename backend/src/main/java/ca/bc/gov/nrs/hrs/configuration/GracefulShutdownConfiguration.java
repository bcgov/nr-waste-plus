package ca.bc.gov.nrs.hrs.configuration;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.stereotype.Component;

/**
 * Listener that closes the application's JPA {@link EntityManager} when the Spring application
 * context is shutting down.
 *
 * <p>Registers as a Spring {@code @Component} and implements {@link ApplicationListener}
 * for {@link ContextClosedEvent}. When the context is closed this listener will call
 * {@link EntityManager#close()} on the injected {@code oracleEntityManager} to ensure database
 * connections and related resources are released gracefully.</p>
 *
 * @since 1.0.0
 */
@Component
@RequiredArgsConstructor
public class GracefulShutdownConfiguration implements ApplicationListener<ContextClosedEvent> {

  /**
   * The Oracle {@link EntityManager} used by the application; closed on context shutdown.
   */
  private final EntityManager oracleEntityManager;

  /**
   * Handle the Spring {@link ContextClosedEvent} by closing the injected {@link EntityManager}.
   *
   * <p>Closing the entity manager ensures that underlying database connections are returned
   * to the pool (or closed) and that any provider-specific cleanup is performed.</p>
   *
   * @param event the context closed event
   */
  @Override
  public void onApplicationEvent(ContextClosedEvent event) {
    oracleEntityManager.close();
  }
}

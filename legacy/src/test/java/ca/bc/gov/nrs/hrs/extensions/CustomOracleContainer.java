package ca.bc.gov.nrs.hrs.extensions;

import java.time.Duration;
import java.util.UUID;
import org.testcontainers.oracle.OracleContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Testcontainers Oracle wrapper with project-specific defaults for integration tests.
 */
public class CustomOracleContainer extends OracleContainer {

  /**
   * Creates a configured Oracle test container instance.
   *
   * @param imageName the Docker image name to use for the Oracle container
   */
  public CustomOracleContainer(String imageName) {
    super(
        DockerImageName
            .parse(imageName)
    );

    this.withDatabaseName("legacyfsa")
        .withUsername("THE")
        .withPassword(UUID.randomUUID().toString().substring(24));
  }

  @Override
  protected void waitUntilContainerStarted() {
    getWaitStrategy()
        .withStartupTimeout(Duration.ofMinutes(10))
        .waitUntilReady(this);
  }

}

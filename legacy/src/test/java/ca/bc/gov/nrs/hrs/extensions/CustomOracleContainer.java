package ca.bc.gov.nrs.hrs.extensions;

import java.time.Duration;
import java.util.UUID;
import org.testcontainers.oracle.OracleContainer;
import org.testcontainers.utility.DockerImageName;

public class CustomOracleContainer extends OracleContainer {

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

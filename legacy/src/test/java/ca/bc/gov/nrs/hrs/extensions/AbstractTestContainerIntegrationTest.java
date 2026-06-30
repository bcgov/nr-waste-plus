package ca.bc.gov.nrs.hrs.extensions;

import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.oracle.OracleContainer;

/**
 * Base integration-test configuration backed by a shared Oracle Testcontainers instance.
 */
@Testcontainers
@ExtendWith({SpringExtension.class})
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration
public abstract class AbstractTestContainerIntegrationTest {

  static final OracleContainer oracle = new CustomOracleContainer(
      "gvenzl/oracle-free:23.6-full-faststart");

  static {
    oracle.start();
  }

  /**
   * Registers datasource properties resolved from the shared Oracle container.
   *
   * @param registry the dynamic property registry used by Spring tests
   */
  @DynamicPropertySource
  static void registerDynamicProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.jdbcUrl", oracle::getJdbcUrl);
    registry.add("spring.datasource.url", oracle::getJdbcUrl);
    registry.add("spring.datasource.username", oracle::getUsername);
    registry.add("spring.datasource.password", oracle::getPassword);
    registry.add("spring.datasource.hikari.username", oracle::getUsername);
    registry.add("spring.datasource.hikari.password", oracle::getPassword);
  }

}

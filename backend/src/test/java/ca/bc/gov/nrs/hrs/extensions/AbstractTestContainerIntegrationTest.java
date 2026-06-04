package ca.bc.gov.nrs.hrs.extensions;

import static ca.bc.gov.nrs.hrs.extensions.WithMockJwtSecurityContextFactory.createJwt;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers
@ExtendWith({SpringExtension.class})
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration
public abstract class AbstractTestContainerIntegrationTest {

  static final PostgreSQLContainer postgres =
      new PostgreSQLContainer("postgres:17")
          .withDatabaseName("hrs")
          .withUsername("hrs")
          .withPassword(UUID.randomUUID().toString());

  static {
    postgres.start();
  }

  @DynamicPropertySource
  static void registerDynamicProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
    registry.add("spring.datasource.hikari.username", postgres::getUsername);
    registry.add("spring.datasource.hikari.password", postgres::getPassword);
  }

  public final Jwt jwt = createJwt(
      "test",
      List.of("Admin"),
      "idir",
      "Test, Automated WLRS:EX",
      "test@test.ca"
  );

  @TestConfiguration
  static class TestAuditingConfiguration {

    @Bean
    public DateTimeProvider dateTimeProvider() {
      // Ensure auditing provides an OffsetDateTime so @CreatedDate/@LastModifiedDate
      // properties of type OffsetDateTime can be set without conversion errors in tests.
      return () -> Optional.of(OffsetDateTime.now());
    }
  }

}

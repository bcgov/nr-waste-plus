package ca.bc.gov.nrs.hrs.controller;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import jakarta.persistence.EntityManagerFactory;
import java.sql.Connection;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.micrometer.tracing.test.autoconfigure.AutoConfigureTracing;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Probes B3 extraction through the web test environment and the database audit trigger.
 *
 * <p>{@code @SpringBootTest} deliberately supplies no-op reporting components unless
 * {@code @AutoConfigureTracing} enables tracing for tests. This test keeps the existing
 * authenticated MockMvc path while explicitly enabling the tracing components required to exercise
 * B3 extraction and audit correlation.
 */
@AutoConfigureMockMvc
@AutoConfigureTracing
@DisplayName("District volume web tracing and audit integration")
class DistrictVolumeCorrelationIdAuditIntegrationTest extends AbstractTestContainerIntegrationTest {

  private static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
  private static final String SPAN_ID = "0123456789abcdef";

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private DataSource dataSource;

  @Autowired
  private EntityManagerFactory entityManagerFactory;

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private org.springframework.transaction.support.TransactionTemplate transactionTemplate;

  @BeforeEach
  @AfterEach
  void resetAuditFixture() {
    // Wipe only the audit tables this test asserts on. hrs.district_volume must NOT be wiped:
    // it holds Flyway-seeded reference rows other test classes rely on, and the POST below is
    // kept collision-free because spike entities in CorrelationIdAuditIntegrationTest use
    // closed date ranges. Auto-commit is enabled (Hikari's default after removing
    // auto-commit: false from application.yml), but fixture maintenance still runs inside an
    // explicit committing transaction for clarity and to match the test mutation pattern.
    transactionTemplate.executeWithoutResult(
        status -> jdbcTemplate.update("TRUNCATE hrs.audit_change, hrs.audit_event"));
  }

  @Test
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  @DisplayName("POST propagates the supplied B3 trace ID to the audit event")
  void postDistrictVolumePersistsB3TraceIdInAuditEvent() throws Exception {
    final long eventIdBefore = maxAuditEventId();

    mockMvc
        .perform(
            MockMvcRequestBuilders.post("/api/configuration/district-average-volumes")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .header("X-B3-TraceId", TRACE_ID)
                .header("X-B3-SpanId", SPAN_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "area": "COASTAL",
                      "startDate": "2099-01-01",
                      "tableLevelFactor": 0.400,
                      "heliMultiplier": 3.470,
                      "tableData": {
                        "type": "COASTAL",
                        "sections": [
                          {
                            "name": "Mature",
                            "districts": [
                              {
                                "code": "DCK",
                                "avoidableSawlog": 2.345,
                                "avoidableHembalGradeU": 1.234,
                                "avoidableGradeY": 0.567,
                                "unavoidable": 0.123,
                                "total": 4.269
                              },
                              {
                                "code": "DCR",
                                "avoidableSawlog": 2.456,
                                "avoidableHembalGradeU": 1.345,
                                "avoidableGradeY": 0.678,
                                "unavoidable": 0.234,
                                "total": 4.713
                              }
                            ]
                          },
                          {
                            "name": "Immature",
                            "districts": [
                              {
                                "code": "DNI",
                                "avoidableSawlog": 1.234,
                                "avoidableHembalGradeU": 0.567,
                                "avoidableGradeY": 0.234,
                                "unavoidable": 0.089,
                                "total": 2.124
                              }
                            ]
                          }
                        ],
                        "formulas": {}
                      }
                    }
                    """))
        .andExpect(MockMvcResultMatchers.status().isCreated());

    try (Connection connection = dataSource.getConnection()) {
      assertThat(connection.getAutoCommit())
          .as("the shared Hikari pool must use its default auto-commit mode")
          .isTrue();
    }
    assertThat(TransactionSynchronizationManager.isActualTransactionActive())
        .as("the request transaction must be closed before the response is returned")
        .isFalse();
    assertThat(TransactionSynchronizationManager.hasResource(entityManagerFactory))
        .as("open-in-view=false must not bind an EntityManager after the request")
        .isFalse();

    Long eventId =
        jdbcTemplate.queryForObject(
            """
        SELECT audit_event_id
        FROM hrs.audit_event
        WHERE audit_event_id > ? AND action = 'CREATE'
        ORDER BY audit_event_id DESC
        LIMIT 1
        """,
            Long.class,
            eventIdBefore);

    assertThat(eventId).isNotNull();
    assertThat(
            jdbcTemplate.queryForObject(
                "SELECT correlation_id FROM hrs.audit_event WHERE audit_event_id = ?",
                String.class,
                eventId))
        .isEqualTo(TRACE_ID);
    assertThat(
            jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM hrs.audit_change WHERE event_id = ?", Integer.class, eventId))
        .isPositive();
  }

  private long maxAuditEventId() {
    Long maxId =
        jdbcTemplate.queryForObject("SELECT MAX(audit_event_id) FROM hrs.audit_event", Long.class);
    return maxId == null ? 0L : maxId;
  }
}

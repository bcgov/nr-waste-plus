package ca.bc.gov.nrs.hrs.controller;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
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

/**
 * Probes B3 extraction through the web test environment and the database audit trigger.
 *
 * <p>{@code @SpringBootTest} deliberately supplies no-op reporting components unless
 * {@code @AutoConfigureTracing} enables tracing for tests. This test keeps the existing
 * authenticated MockMvc path while explicitly enabling the tracing components required to
 * exercise B3 extraction and audit correlation.
 */
@AutoConfigureMockMvc
@AutoConfigureTracing
@DisplayName("District volume web tracing and audit integration")
class DistrictVolumeCorrelationIdAuditIntegrationTest
    extends AbstractTestContainerIntegrationTest {

  private static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
  private static final String SPAN_ID = "0123456789abcdef";

  @Autowired
  private JdbcTemplate jdbcTemplate;

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
    // closed date ranges. auto-commit is disabled pool-wide, so this must run inside a real
    // committing transaction or Hikari rolls it back on connection return.
    transactionTemplate.executeWithoutResult(
        status -> jdbcTemplate.update("TRUNCATE hrs.audit_change, hrs.audit_event"));
  }

  @Test
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  @DisplayName("POST propagates the supplied B3 trace ID to the audit event")
  void postDistrictVolumePersistsB3TraceIdInAuditEvent() throws Exception {
    long eventIdBefore = maxAuditEventId();

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .post("/api/configuration/district-average-volumes")
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


    Long eventId = jdbcTemplate.queryForObject(
        """
        SELECT id
        FROM hrs.audit_event
        WHERE id > ? AND action = 'CREATE'
        ORDER BY id DESC
        LIMIT 1
        """,
        Long.class,
        eventIdBefore);

    assertThat(eventId).isNotNull();
    assertThat(jdbcTemplate.queryForObject(
            "SELECT correlation_id FROM hrs.audit_event WHERE id = ?", String.class, eventId))
        .isEqualTo(TRACE_ID);
    assertThat(jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hrs.audit_change WHERE event_id = ?", Integer.class, eventId))
        .isPositive();
  }

  private long maxAuditEventId() {
    Long maxId = jdbcTemplate.queryForObject("SELECT MAX(id) FROM hrs.audit_event", Long.class);
    return maxId == null ? 0L : maxId;
  }
}

package ca.bc.gov.nrs.hrs.controller;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
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
                      "area": "INTERIOR",
                      "startDate": "2099-01-01",
                      "tableLevelFactor": 1.000,
                      "tableData": {
                        "type": "INTERIOR",
                        "zones": [],
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

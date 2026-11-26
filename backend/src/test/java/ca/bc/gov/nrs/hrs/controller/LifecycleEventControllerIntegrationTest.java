package ca.bc.gov.nrs.hrs.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.entity.block.BlockCommentEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.repository.block.BlockCommentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Lifecycle Event Controller")
class LifecycleEventControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  private static final String ACTOR = "lifecycle-int-test";
  private static final String CLIENT_NUMBER = "00012345";

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ReportingUnitRepository reportingUnitRepository;

  @Autowired
  private BlockRepository blockRepository;

  @Autowired
  private StatusEventRepository statusEventRepository;

  @Autowired
  private BlockCommentRepository blockCommentRepository;

  private Long reportingUnitId;
  private Long blockId;

  @BeforeEach
  void setUp() {
    String unique = UUID.randomUUID().toString().substring(0, 8);

    ReportingUnitEntity ru = new ReportingUnitEntity();
    ru.setClientNumber(CLIENT_NUMBER);
    ru.setClientLocnCode("LC-" + unique);
    ru.setGeographicCode("DKM");
    ru.setGradeCode("COASTAL");
    ru.setSamplingCode("AVG");
    audit(ru);
    ReportingUnitEntity savedRu = reportingUnitRepository.saveAndFlush(ru);
    reportingUnitId = savedRu.getId();

    BlockEntity block = new BlockEntity();
    block.setReportingUnitId(reportingUnitId);
    block.setBlockType("DISTRICT_AVERAGE");
    block.setDraft(true);
    block.setStatusCode("DFT");
    block.setPlcDate(LocalDate.of(2026, Month.JANUARY, 15));
    audit(block);
    BlockEntity savedBlock = blockRepository.saveAndFlush(block);
    blockId = savedBlock.getId();
  }

  private void audit(ReportingUnitEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
    entity.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
  }

  private void audit(BlockEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
    entity.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
  }

  @Test
  @DisplayName("POST /lifecycle-events round trip verifies ETag, DB rows, and read consistency")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"WASTE_PLUS_SUBMITTER_00012345"})
  void cancelTransition_persistsDbRows_bumpsEtag_andReadsCancelledConsistently()
      throws Exception {

    // 1. Pre-condition: Block reads as DRAFT in details
    mockMvc
        .perform(get("/api/reporting-units/{ruId}/blocks/{blockId}", reportingUnitId, blockId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.state").value("DRAFT"))
        .andExpect(jsonPath("$.draft").value(true));

    BlockEntity initialBlock = blockRepository.findById(blockId).orElseThrow();
    Long initialRevision = initialBlock.getRevision();

    // 2. POST CANCEL transition with If-Match header
    String requestBody =
        """
        {
          "event": "CANCEL",
          "comment": "Cancellation reason recorded by submitter"
        }
        """;

    MvcResult postResult =
        mockMvc
            .perform(
                post(
                        "/api/reporting-units/{ruId}/{blockId}/lifecycle-events",
                        reportingUnitId,
                        blockId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Idempotency-Key", UUID.randomUUID().toString())
                    .header("If-Match", "\"" + initialRevision + "\"")
                    .content(requestBody)
                    .with(SecurityMockMvcRequestPostProcessors.csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.state").value("CANCELLED"))
            .andExpect(jsonPath("$.previousState").value("DRAFT"))
            .andExpect(jsonPath("$.event").value("CANCEL"))
            .andReturn();

    String returnedEtag = postResult.getResponse().getHeader(HttpHeaders.ETAG);
    assertThat(returnedEtag).isNotNull();

    // 3. Verify Postgres DB state: block updated, status_event created, block_comment created
    BlockEntity updatedBlock = blockRepository.findById(blockId).orElseThrow();
    assertThat(updatedBlock.isDraft()).isFalse();
    assertThat(updatedBlock.getStatusCode()).isEqualTo("CAN");
    assertThat(updatedBlock.getRevision()).isGreaterThan(initialRevision);
    assertThat(returnedEtag).isEqualTo("\"" + updatedBlock.getRevision() + "\"");

    List<StatusEventEntity> events =
        statusEventRepository.findByBlockIdOrderByCreatedAtAscIdAsc(blockId);
    assertThat(events).hasSize(1);
    assertThat(events.get(0).getEventType()).isEqualTo("CANCEL");
    assertThat(events.get(0).getStatus()).isEqualTo("CANCELLED");

    List<BlockCommentEntity> comments =
        blockCommentRepository.findByBlockIdAndDeletedFalse(blockId);
    assertThat(comments).hasSize(1);
    assertThat(comments.get(0).getComment())
        .isEqualTo("Cancellation reason recorded by submitter");

    // 4. Verify read consistency across all endpoints:
    // (a) Block details endpoint:
    mockMvc
        .perform(get("/api/reporting-units/{ruId}/blocks/{blockId}", reportingUnitId, blockId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.state").value("CANCELLED"))
        .andExpect(jsonPath("$.draft").value(false));

    // (b) Block listing endpoint:
    mockMvc
        .perform(get("/api/reporting-units/{ruId}/blocks", reportingUnitId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].status.code").value("CAN"))
        .andExpect(jsonPath("$.content[0].status.description").value("Cancelled"));

    // (c) Lifecycle details endpoint:
    mockMvc
        .perform(
            get(
                "/api/reporting-units/{ruId}/{blockId}/lifecycle",
                reportingUnitId,
                blockId))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, returnedEtag))
        .andExpect(jsonPath("$.state").value("CANCELLED"))
        .andExpect(jsonPath("$.history[0].event").value("CANCEL"))
        .andExpect(jsonPath("$.history[0].toState").value("CANCELLED"));
  }

  @Test
  @DisplayName("POST /lifecycle-events with stale If-Match returns 412 Precondition Failed")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"WASTE_PLUS_SUBMITTER_00012345"})
  void staleEtag_returns412() throws Exception {
    String requestBody =
        """
        {
          "event": "CANCEL",
          "comment": "Testing stale ETag"
        }
        """;

    mockMvc
        .perform(
            post(
                    "/api/reporting-units/{ruId}/{blockId}/lifecycle-events",
                    reportingUnitId,
                    blockId)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .header("If-Match", "\"999999\"")
                .content(requestBody)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isPreconditionFailed());
  }

  @Test
  @DisplayName("Illegal transition returns 409 and leaves zero status events or comments")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"WASTE_PLUS_SUBMITTER_00012345"})
  void illegalTransition_returns409_rollsBackWithoutPersistingRows() throws Exception {
    BlockEntity initialBlock = blockRepository.findById(blockId).orElseThrow();
    Long initialRevision = initialBlock.getRevision();

    // SUBMITTER attempting APPROVE on a DRAFT block (illegal transition)
    String requestBody =
        """
        {
          "event": "APPROVE",
          "comment": "Attempting illegal transition"
        }
        """;

    mockMvc
        .perform(
            post(
                    "/api/reporting-units/{ruId}/{blockId}/lifecycle-events",
                    reportingUnitId,
                    blockId)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .header("If-Match", "\"" + initialRevision + "\"")
                .content(requestBody)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ILLEGAL_TRANSITION"));

    // Verify rollback: no status_event or comment was saved
    List<StatusEventEntity> events =
        statusEventRepository.findByBlockIdOrderByCreatedAtAscIdAsc(blockId);
    assertThat(events).isEmpty();

    List<BlockCommentEntity> comments =
        blockCommentRepository.findByBlockIdAndDeletedFalse(blockId);
    assertThat(comments).isEmpty();

    BlockEntity currentBlock = blockRepository.findById(blockId).orElseThrow();
    assertThat(currentBlock.isDraft()).isTrue();
    assertThat(currentBlock.getStatusCode()).isEqualTo("DFT");
    assertThat(currentBlock.getRevision()).isEqualTo(initialRevision);
  }
}

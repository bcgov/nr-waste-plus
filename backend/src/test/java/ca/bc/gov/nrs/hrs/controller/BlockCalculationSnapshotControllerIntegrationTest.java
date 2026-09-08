package ca.bc.gov.nrs.hrs.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.util.UUID;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Integration test for snapshot read endpoints. */
@AutoConfigureMockMvc
@DisplayName("Integrated Test | Block Calculation Snapshot Controller")
class BlockCalculationSnapshotControllerIntegrationTest
    extends AbstractTestContainerIntegrationTest {

  private static final String ACTOR = "snapshot-ctrl-test";
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final Instant NOW = Instant.parse("2025-07-01T00:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ReportingUnitRepository reportingUnitRepository;
  @Autowired private BlockRepository blockRepository;
  @Autowired private BlockCalculationSnapshotRepository snapshotRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  private Long blockId;

  @BeforeEach
  void setUp() throws Exception {
    String unique = UUID.randomUUID().toString().substring(0, 8);

    ReportingUnitEntity ru = new ReportingUnitEntity();
    ru.setClientNumber("0000" + unique.substring(0, 4));
    ru.setClientLocnCode("CTRL-" + unique);
    ru.setOrgUnitNo("DCC");
    audit(ru);
    ReportingUnitEntity savedRu = reportingUnitRepository.saveAndFlush(ru);

    BlockEntity block = new BlockEntity();
    block.setReportingUnitId(savedRu.getId());
    block.setBlockType("DISTRICT_AVERAGE");
    block.setDraft(false);
    block.setPlcDate(LocalDate.of(2025, Month.JUNE, 1));
    audit(block);
    BlockEntity savedBlock = blockRepository.saveAndFlush(block);
    blockId = savedBlock.getId();

    Long dvId = jdbcTemplate.queryForObject(
        "SELECT id FROM hrs.district_volume ORDER BY id LIMIT 1", Long.class);

    var inputs1 = MAPPER.readTree("{\"da.rate\":10}");
    var outputs1 = MAPPER.readTree("{\"config.total\":10.000}");
    Instant t1 = Instant.parse("2025-07-01T08:00:00Z");
    snapshotRepository.save(new BlockCalculationSnapshotEntity(
        blockId, dvId, LocalDate.of(2025, Month.JANUARY, 1),
        LocalDate.of(2025, Month.DECEMBER, 31),
        inputs1, outputs1, t1, "HALF_UP", null,
        ACTOR, ACTOR, t1, t1));

    var inputs2 = MAPPER.readTree("{\"da.rate\":20}");
    var outputs2 = MAPPER.readTree("{\"config.total\":20.000}");
    Instant t2 = Instant.parse("2025-07-01T12:00:00Z");
    snapshotRepository.save(new BlockCalculationSnapshotEntity(
        blockId, dvId, LocalDate.of(2025, Month.JANUARY, 1),
        LocalDate.of(2025, Month.DECEMBER, 31),
        inputs2, outputs2, t2, "HALF_UP", null,
        ACTOR, ACTOR, t2, t2));
  }

  @Test
  @DisplayName("GET /api/blocks/{blockId}/snapshots returns 200 with ordered list")
  @WithMockJwt
  void listReturnsOrderedList() throws Exception {
    mockMvc.perform(get("/api/blocks/{blockId}/snapshots", blockId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].roundingPolicy").value("HALF_UP"))
        .andExpect(jsonPath("$[0].blockId").value(blockId));
  }

  @Test
  @DisplayName("GET /api/blocks/{blockId}/snapshots/latest returns 200 with newest")
  @WithMockJwt
  void latestReturnsNewest() throws Exception {
    mockMvc.perform(get("/api/blocks/{blockId}/snapshots/latest", blockId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.blockId").value(blockId))
        .andExpect(jsonPath("$.roundingPolicy").value("HALF_UP"));
  }

  @Test
  @DisplayName("GET /api/blocks/{blockId}/snapshots/{id} returns 200 with specific snapshot")
  @WithMockJwt
  void getByIdReturnsSnapshot() throws Exception {
    var snapshots = snapshotRepository.findByBlockIdOrderByCalculatedAtDesc(blockId);
    Long snapshotId = snapshots.getFirst().getId();

    mockMvc.perform(get("/api/blocks/{blockId}/snapshots/{snapshotId}", blockId, snapshotId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(snapshotId))
        .andExpect(jsonPath("$.blockId").value(blockId));
  }

  @Test
  @DisplayName("GET /api/blocks/{blockId}/snapshots/{id} returns 404 for wrong block")
  @WithMockJwt
  void getByIdReturnsNotFoundForWrongBlock() throws Exception {
    var snapshots = snapshotRepository.findByBlockIdOrderByCalculatedAtDesc(blockId);
    Long snapshotId = snapshots.getFirst().getId();

    mockMvc.perform(get("/api/blocks/{blockId}/snapshots/{snapshotId}", 999999L, snapshotId))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("GET /api/blocks/{blockId}/snapshots returns empty for unknown block")
  @WithMockJwt
  void listReturnsEmptyForUnknownBlock() throws Exception {
    mockMvc.perform(get("/api/blocks/{blockId}/snapshots", 999999L))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(0));
  }

  private void audit(ReportingUnitEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(NOW);
    entity.setUpdatedAt(NOW);
  }

  private void audit(BlockEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(NOW);
    entity.setUpdatedAt(NOW);
  }
}

package ca.bc.gov.nrs.hrs.entity.block;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/** PostgreSQL round-trip tests for immutable calculation snapshot persistence. */
@DisplayName("Integrated Test | Block Calculation Snapshot Persistence")
class BlockCalculationSnapshotIntegrationTest extends AbstractTestContainerIntegrationTest {
  private static final String ACTOR = "snapshot-test";
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final Instant NOW = Instant.parse("2025-07-01T00:00:00Z");

  @Autowired private ReportingUnitRepository reportingUnitRepository;
  @Autowired private BlockRepository blockRepository;
  @Autowired private BlockCalculationSnapshotRepository snapshotRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  private Long blockId;
  private Long districtVolumeId;

  @BeforeEach
  void setUp() {
    String unique = UUID.randomUUID().toString().substring(0, 8);

    ReportingUnitEntity ru = new ReportingUnitEntity();
    ru.setClientNumber("0000" + unique.substring(0, 4));
    ru.setClientLocnCode("SNAP-" + unique);
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

    districtVolumeId = jdbcTemplate.queryForObject(
        "SELECT district_volume_id FROM hrs.district_volume ORDER BY district_volume_id LIMIT 1", Long.class);
  }

  @DisplayName("Saves and retrieves snapshot by id with JSONB round-trip")
  @Test
  void savesAndRetrievesSnapshotById() throws Exception {
    var inputs = MAPPER.readTree("{\"da.mature.total\":11.530,\"sc.AL\":2.500}");
    var outputs = MAPPER.readTree("{\"config.total\":14.030,\"config.species.AL\":2.500}");
    var warnings = MAPPER.readTree("[\"rounding_applied\"]");
    Instant calculatedAt = Instant.parse("2025-07-01T10:00:00Z");

    BlockCalculationSnapshotEntity snapshot = new BlockCalculationSnapshotEntity(
        blockId, districtVolumeId,
        LocalDate.of(2025, Month.JANUARY, 1), LocalDate.of(2025, Month.DECEMBER, 31),
        inputs, outputs, calculatedAt, "HALF_UP", warnings,
        ACTOR, ACTOR, calculatedAt, calculatedAt);
    BlockCalculationSnapshotEntity saved = snapshotRepository.save(snapshot);

    BlockCalculationSnapshotEntity found = snapshotRepository.findById(saved.getId()).orElseThrow();
    assertThat(found.getBlockId()).isEqualTo(blockId);
    assertThat(found.getDistrictVolumeId()).isEqualTo(districtVolumeId);
    assertThat(found.getInputs()).isEqualTo(inputs);
    assertThat(found.getOutputs()).isEqualTo(outputs);
    assertThat(found.getWarnings()).isEqualTo(warnings);
    assertThat(found.getCalculatedAt()).isEqualTo(calculatedAt);
    assertThat(found.getRoundingPolicy()).isEqualTo("HALF_UP");
  }

  @DisplayName("Multiple snapshots for same block returned in newest-first order")
  @Test
  void multipleSnapshotsOrderedByCalculatedAtDesc() throws Exception {
    LocalDate windowStart = LocalDate.of(2025, Month.JANUARY, 1);
    LocalDate windowEnd = LocalDate.of(2025, Month.DECEMBER, 31);

    var inputs1 = MAPPER.readTree("{\"da.x\":1}");
    var outputs1 = MAPPER.readTree("{\"config.a\":10}");
    Instant t1 = Instant.parse("2025-07-01T08:00:00Z");
    BlockCalculationSnapshotEntity s1 = snapshotRepository.save(
        new BlockCalculationSnapshotEntity(
            blockId, districtVolumeId, windowStart, windowEnd,
            inputs1, outputs1, t1, "HALF_UP", null,
            ACTOR, ACTOR, t1, t1));

    var inputs2 = MAPPER.readTree("{\"da.x\":2}");
    var outputs2 = MAPPER.readTree("{\"config.a\":20}");
    Instant t2 = Instant.parse("2025-07-01T12:00:00Z");
    BlockCalculationSnapshotEntity s2 = snapshotRepository.save(
        new BlockCalculationSnapshotEntity(
            blockId, districtVolumeId, windowStart, windowEnd,
            inputs2, outputs2, t2, "HALF_UP", null,
            ACTOR, ACTOR, t2, t2));

    var inputs3 = MAPPER.readTree("{\"da.x\":3}");
    var outputs3 = MAPPER.readTree("{\"config.a\":30}");
    Instant t3 = Instant.parse("2025-07-01T16:00:00Z");
    BlockCalculationSnapshotEntity s3 = snapshotRepository.save(
        new BlockCalculationSnapshotEntity(
            blockId, districtVolumeId, windowStart, windowEnd,
            inputs3, outputs3, t3, "HALF_UP", null,
            ACTOR, ACTOR, t3, t3));

    List<BlockCalculationSnapshotEntity> results =
        snapshotRepository.findByBlockIdOrderByCalculatedAtDesc(blockId);

    assertThat(results).hasSize(3);
    assertThat(results.get(0).getId()).isEqualTo(s3.getId());
    assertThat(results.get(1).getId()).isEqualTo(s2.getId());
    assertThat(results.get(2).getId()).isEqualTo(s1.getId());
  }

  @DisplayName("Snapshot with null HBS window fields persists correctly")
  @Test
  void snapshotWithNullHbsWindowPersists() throws Exception {
    var inputs = MAPPER.readTree("{\"da.rate\":5}");
    var outputs = MAPPER.readTree("{\"config.total\":5.000}");

    BlockCalculationSnapshotEntity snapshot = new BlockCalculationSnapshotEntity(
        blockId, districtVolumeId, null, null,
        inputs, outputs, NOW, "HALF_UP", null,
        ACTOR, ACTOR, NOW, NOW);
    BlockCalculationSnapshotEntity saved = snapshotRepository.save(snapshot);

    BlockCalculationSnapshotEntity found = snapshotRepository.findById(saved.getId()).orElseThrow();
    assertThat(found.getHbsWindowStart()).isNull();
    assertThat(found.getHbsWindowEnd()).isNull();
    assertThat(found.getInputs()).isEqualTo(inputs);
    assertThat(found.getOutputs()).isEqualTo(outputs);
  }

  @DisplayName("Non-existent block id returns no snapshots")
  @Test
  void nonExistentBlockIdReturnsNoSnapshots() {
    List<BlockCalculationSnapshotEntity> results =
        snapshotRepository.findByBlockIdOrderByCalculatedAtDesc(999999L);
    assertThat(results).isEmpty();
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

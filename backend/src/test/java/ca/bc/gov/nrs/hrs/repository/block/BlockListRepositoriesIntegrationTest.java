package ca.bc.gov.nrs.hrs.repository.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockMarkEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockSubmitterEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.transaction.support.TransactionTemplate;

@DisplayName("Integration Test | Block list repositories")
class BlockListRepositoriesIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired private ReportingUnitRepository reportingUnitRepository;
  @Autowired private BlockRepository blockRepository;
  @Autowired private BlockMarkRepository blockMarkRepository;
  @Autowired private BlockSubmitterRepository blockSubmitterRepository;
  @Autowired private DistrictAverageBlockRepository districtAverageBlockRepository;
  @Autowired private StatusEventRepository statusEventRepository;
  @Autowired private JdbcTemplate jdbcTemplate;
  @Autowired private TransactionTemplate transactionTemplate;

  private String fixtureActor;
  private Long fixtureReportingUnitId;

  @Test
  @DisplayName("shouldApplyBlockListDerivedQueries_whenRowsExistWithDeletedAndOrderedRows")
  void shouldApplyBlockListDerivedQueries_whenRowsExistWithDeletedAndOrderedRows() {
    String actor = "test-block-list-repository-" + UUID.randomUUID();
    fixtureActor = actor;

    transactionTemplate.executeWithoutResult(
        transaction -> {
          ReportingUnitEntity reportingUnitToSave = new ReportingUnitEntity();
          reportingUnitToSave.setClientNumber("00012797");
          reportingUnitToSave.setClientLocnCode(
              "TEST-" + UUID.randomUUID().toString().substring(0, 8));
          reportingUnitToSave.setOrgUnitNo("DND");
          reportingUnitToSave.setCreatedBy(actor);
          reportingUnitToSave.setUpdatedBy(actor);
          ReportingUnitEntity reportingUnit =
              reportingUnitRepository.saveAndFlush(reportingUnitToSave);
          fixtureReportingUnitId = reportingUnit.getId();

          BlockEntity firstBlock = block(reportingUnit.getId(), actor, true);
          firstBlock = blockRepository.saveAndFlush(firstBlock);
          BlockEntity secondBlock = block(reportingUnit.getId(), actor, false);
          secondBlock = blockRepository.saveAndFlush(secondBlock);
          BlockEntity deletedBlock = block(reportingUnit.getId(), actor, false);
          deletedBlock.setDeleted(true);
          deletedBlock = blockRepository.saveAndFlush(deletedBlock);

          Long reportingUnitId = reportingUnit.getId();
          assertThatThrownBy(
                  () -> blockRepository.findByReportingUnitIdAndDeletedFalse(reportingUnitId))
              .isInstanceOf(IncorrectResultSizeDataAccessException.class);
          assertThat(
                  blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(
                      firstBlock.getId(), reportingUnit.getId()))
              .contains(firstBlock);
          assertThat(
                  blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(
                      deletedBlock.getId(), reportingUnit.getId()))
              .isEmpty();

          BlockMarkEntity earlierMark = primaryMark(firstBlock.getId(), actor, 0, "EARLY");
          earlierMark.setForestFileId("FILE-PRIMARY");
          earlierMark.setCuttingPermitId("CP-PRIMARY");
          earlierMark.setCutBlockId("CUT-PRIMARY");
          earlierMark.setTimberMark("TM-PRIMARY");
          BlockMarkEntity laterMark = primaryMark(firstBlock.getId(), actor, 1, "LATE");
          BlockMarkEntity deletedMark = primaryMark(firstBlock.getId(), actor, -1, "DELETED");
          deletedMark.setDeleted(true);
          blockMarkRepository.saveAllAndFlush(List.of(laterMark, deletedMark, earlierMark));
          assertThat(
                  blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
                      firstBlock.getId(), "PRIMARY"))
              .extracting(BlockMarkEntity::getMark)
              .containsExactly("EARLY", "LATE");

          BlockSubmitterEntity firstSubmitter = submitter(firstBlock.getId(), actor, "First");
          BlockSubmitterEntity secondSubmitter = submitter(firstBlock.getId(), actor, "Second");
          BlockSubmitterEntity deletedSubmitter =
              submitter(firstBlock.getId(), actor, "Deleted");
          deletedSubmitter.setDeleted(true);
          blockSubmitterRepository.saveAndFlush(firstSubmitter);
          blockSubmitterRepository.saveAndFlush(secondSubmitter);
          blockSubmitterRepository.saveAndFlush(deletedSubmitter);
          assertThat(
                  blockSubmitterRepository.findFirstByBlockIdAndDeletedFalseOrderById(
                      firstBlock.getId()))
              .get()
              .extracting(BlockSubmitterEntity::getSubmitterName)
              .isEqualTo("First");

          jdbcTemplate.update(
              """
              INSERT INTO hrs.district_average_block
                  (district_average_block_id, coast_ground_based_area_ha,
                   coast_helicopter_area_ha, has_dispersed_retention, is_heli_logging,
                   created_by, updated_by)
              VALUES (?, 12.125, 3.375, FALSE, FALSE, ?, ?)
              """,
              firstBlock.getId(),
              actor,
              actor);
          jdbcTemplate.update(
              """
              INSERT INTO hrs.district_average_block
                  (district_average_block_id, has_dispersed_retention, is_heli_logging,
                   is_deleted, created_by, updated_by)
              VALUES (?, FALSE, FALSE, TRUE, ?, ?)
              """,
              secondBlock.getId(),
              actor,
              actor);
          assertThat(
                  districtAverageBlockRepository.findByBlockIdAndDeletedFalse(
                      firstBlock.getId()))
              .isPresent();
          assertThat(
                  districtAverageBlockRepository.findByBlockIdAndDeletedFalse(secondBlock.getId()))
              .isEmpty();

          StatusEventEntity olderStatus = status(firstBlock.getId(), actor, "DFT");
          olderStatus.setCreatedAt(Instant.parse("2024-01-01T00:00:00Z"));
          olderStatus.setUpdatedAt(Instant.parse("2024-01-01T00:00:00Z"));
          StatusEventEntity newestStatus = status(firstBlock.getId(), actor, "APP");
          newestStatus.setCreatedAt(Instant.parse("2025-01-01T00:00:00Z"));
          newestStatus.setUpdatedAt(Instant.parse("2025-01-01T00:00:00Z"));
          statusEventRepository.save(olderStatus);
          statusEventRepository.save(newestStatus);
          assertThat(
                  statusEventRepository.findFirstByBlockIdOrderByCreatedAtDesc(firstBlock.getId()))
              .get()
              .extracting(StatusEventEntity::getStatus)
              .isEqualTo("APP");

          StatusEventEntity tieBreakStatus = status(firstBlock.getId(), actor, "SUBMITTED");
          tieBreakStatus.setCreatedAt(Instant.parse("2025-01-01T00:00:00Z"));
          tieBreakStatus.setUpdatedAt(Instant.parse("2025-01-01T00:00:00Z"));
          statusEventRepository.save(tieBreakStatus);

          List<BlockListItemProjection> blockListRows =
              blockRepository.findBlockListItemsByReportingUnitId(reportingUnit.getId());
          assertThat(blockListRows)
              .hasSize(2)
              .extracting(BlockListItemProjection::getId)
              .containsExactly(firstBlock.getId(), secondBlock.getId());
          assertThat(blockListRows.getFirst().getLicenseNumber()).isEqualTo("FILE-PRIMARY");
          assertThat(blockListRows.getFirst().getCuttingPermit()).isEqualTo("CP-PRIMARY");
          assertThat(blockListRows.getFirst().getCutBlockId()).isEqualTo("CUT-PRIMARY");
          assertThat(blockListRows.getFirst().getTimberMark()).isEqualTo("TM-PRIMARY");
          assertThat(blockListRows.getFirst().getTotalWasteAreaHa())
              .isEqualByComparingTo("15.500");
          assertThat(blockListRows.getFirst().getSubmitter()).isEqualTo("First");
          assertThat(blockListRows.getFirst().getRawStatus()).isEqualTo("SUBMITTED");
          assertThat(blockListRows.getFirst().getUpdatedAt()).isNotNull();
          assertThat(blockListRows.get(1).getLicenseNumber()).isNull();
          assertThat(blockListRows.get(1).getTotalWasteAreaHa()).isNull();
          assertThat(blockListRows.get(1).getSubmitter()).isNull();
          assertThat(blockListRows.get(1).getRawStatus()).isNull();

        });
  }

  @AfterEach
  void cleanUpFixtures() {
    if (fixtureActor != null) {
      transactionTemplate.executeWithoutResult(
          transaction -> deleteFixtures(fixtureActor, fixtureReportingUnitId));
    }
  }

  private void deleteFixtures(String actor, Long reportingUnitId) {
    jdbcTemplate.update(
        "DELETE FROM hrs.status_event WHERE block_id IN "
            + "(SELECT block_id FROM hrs.block WHERE created_by = ?)",
        actor);
    jdbcTemplate.update("DELETE FROM hrs.block_submitter WHERE created_by = ?", actor);
    jdbcTemplate.update("DELETE FROM hrs.district_average_block WHERE created_by = ?", actor);
    jdbcTemplate.update("DELETE FROM hrs.block_mark WHERE created_by = ?", actor);
    jdbcTemplate.update("DELETE FROM hrs.block WHERE created_by = ?", actor);
    jdbcTemplate.update("DELETE FROM hrs.reporting_unit WHERE reporting_unit_id = ?", reportingUnitId);
  }

  private static BlockEntity block(Long reportingUnitId, String actor, boolean districtAverage) {
    BlockEntity block = new BlockEntity();
    block.setReportingUnitId(reportingUnitId);
    block.setBlockType(districtAverage ? "DISTRICT_AVERAGE" : "OTHER");
    block.setCreatedBy(actor);
    block.setUpdatedBy(actor);
    return block;
  }

  private static BlockMarkEntity primaryMark(
      Long blockId, String actor, int sequence, String markName) {
    BlockMarkEntity mark = new BlockMarkEntity();
    mark.setBlockId(blockId);
    mark.setMarkType("PRIMARY");
    mark.setSequenceNo(sequence);
    mark.setMark(markName);
    mark.setCreatedBy(actor);
    mark.setUpdatedBy(actor);
    return mark;
  }

  private static BlockSubmitterEntity submitter(Long blockId, String actor, String name) {
    BlockSubmitterEntity submitter = new BlockSubmitterEntity();
    submitter.setBlockId(blockId);
    submitter.setSubmitterId(name);
    submitter.setSubmitterName(name);
    submitter.setFirstName(name);
    submitter.setLastName(name);
    submitter.setCreatedBy(actor);
    submitter.setUpdatedBy(actor);
    return submitter;
  }

  private static StatusEventEntity status(Long blockId, String actor, String code) {
    StatusEventEntity status = new StatusEventEntity();
    status.setBlockId(blockId);
    status.setStatus(code);
    status.setEventType("SUBMISSION");
    status.setCreatedBy(actor);
    status.setUpdatedBy(actor);
    return status;
  }
}

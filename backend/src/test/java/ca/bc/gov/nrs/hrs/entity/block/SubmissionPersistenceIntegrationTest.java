package ca.bc.gov.nrs.hrs.entity.block;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.repository.block.BlockAreaSegmentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockCommentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockMarkRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRequirementRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockSponsorRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockSubmitterRepository;
import ca.bc.gov.nrs.hrs.repository.block.DistrictAverageBlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.DisplayName;

/** PostgreSQL round-trip and repository contract tests for submission persistence. */
@DisplayName("Integrated Test | Submission Persistence")
class SubmissionPersistenceIntegrationTest extends AbstractTestContainerIntegrationTest {
  private static final String ACTOR = "submission-test";
  private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

  @Autowired private ReportingUnitRepository reportingUnitRepository;
  @Autowired private BlockRepository blockRepository;
  @Autowired private DistrictAverageBlockRepository districtAverageBlockRepository;
  @Autowired private BlockMarkRepository blockMarkRepository;
  @Autowired private BlockAreaSegmentRepository blockAreaSegmentRepository;
  @Autowired private BlockAttachmentRepository blockAttachmentRepository;
  @Autowired private BlockSubmitterRepository blockSubmitterRepository;
  @Autowired private BlockSponsorRepository blockSponsorRepository;
  @Autowired private BlockRequirementRepository blockRequirementRepository;
  @Autowired private BlockCommentRepository blockCommentRepository;
  @Autowired private BlockCalculationSnapshotRepository snapshotRepository;
  @Autowired private StatusEventRepository statusEventRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  @DisplayName("Persists And Reads Submission Rows And Json Payloads")
  @Test
  void persistsAndReadsSubmissionRowsAndJsonPayloads() throws Exception {
    ReportingUnitEntity reportingUnit = new ReportingUnitEntity();
    reportingUnit.setClientNumber("00001234");
    reportingUnit.setClientLocnCode("LOC-1");
    reportingUnit.setOrgUnitNo("DCC");
    audit(reportingUnit);
    ReportingUnitEntity savedUnit = reportingUnitRepository.saveAndFlush(reportingUnit);

    BlockEntity block = new BlockEntity();
    block.setReportingUnitId(savedUnit.getId());
    block.setBlockType("DISTRICT_AVERAGE");
    block.setDraft(false);
    block.setPlcDate(LocalDate.of(2025, Month.JUNE, 1));
    audit(block);
    BlockEntity savedBlock = blockRepository.saveAndFlush(block);

    DistrictAverageBlockEntity extension = new DistrictAverageBlockEntity();
    extension.setBlock(savedBlock);
    extension.setBenchmarkZone("DRY");
    extension.setRetentionPercentage(new BigDecimal("12.50"));
    extension.setCriteria(List.of(1, 2));
    extension.setHarvestStatusCode("ACTIVE");
    extension.setRevision(1L);
    audit(extension);
    districtAverageBlockRepository.saveAndFlush(extension);

    BlockMarkEntity mark = new BlockMarkEntity();
    mark.setBlockId(savedBlock.getId());
    mark.setMarkType("PRIMARY");
    mark.setSequenceNo(1);
    mark.setMark("A12345");
    mark.setValidationStatus("VALID");
    mark.setForestFileId("R12345");
    mark.setTimberMark("TM123");
    mark.setCuttingPermitId("CP123");
    mark.setCutBlockId("CB123");
    audit(mark);
    BlockMarkEntity savedMark = blockMarkRepository.saveAndFlush(mark);

    BlockAreaSegmentEntity segment = new BlockAreaSegmentEntity();
    segment.setBlockId(savedBlock.getId());
    segment.setSource("MANUAL");
    segment.setAreaHa(new BigDecimal("10.125"));
    segment.setRoadLengthM(new BigDecimal("20.125"));
    segment.setRoadWidthM(new BigDecimal("4.125"));
    segment.setBlockMarkId(savedMark.getId());
    segment.setStartingAreaHa(new BigDecimal("11.125"));
    segment.setNetWasteAreaHa(new BigDecimal("9.125"));
    audit(segment);
    blockAreaSegmentRepository.saveAndFlush(segment);

    BlockAttachmentEntity attachment = new BlockAttachmentEntity();
    attachment.setBlockId(savedBlock.getId());
    attachment.setObjectKey("submissions/file.pdf");
    attachment.setFileName("file.pdf");
    attachment.setContentType("application/pdf");
    attachment.setFileSizeBytes(1024L);
    attachment.setScanStatus("CLEAN");
    audit(attachment);
    BlockAttachmentEntity savedAttachment = blockAttachmentRepository.saveAndFlush(attachment);

    BlockRequirementEntity requirement = new BlockRequirementEntity();
    requirement.setBlockId(savedBlock.getId());
    requirement.setRequirementCode("REQ-1");
    requirement.setAnsweredYes(true);
    requirement.setResponse("yes");
    requirement.setLinkedAttachmentId(savedAttachment.getId());
    audit(requirement);
    blockRequirementRepository.saveAndFlush(requirement);

    BlockCommentEntity comment = new BlockCommentEntity();
    comment.setBlockId(savedBlock.getId());
    comment.setContext("SUBMISSION");
    comment.setComment("Ready");
    audit(comment);
    blockCommentRepository.saveAndFlush(comment);

    BlockSubmitterEntity submitter = new BlockSubmitterEntity();
    submitter.setBlockId(savedBlock.getId());
    submitter.setSubmitterId("submitter-1");
    submitter.setFirstName("Test");
    submitter.setEmail("test@example.com");
    audit(submitter);
    blockSubmitterRepository.saveAndFlush(submitter);

    BlockSponsorEntity sponsor = new BlockSponsorEntity();
    sponsor.setBlockId(savedBlock.getId());
    sponsor.setSponsorId("sponsor-1");
    sponsor.setDesignation("RPF");
    sponsor.setPhone("555-0100");
    audit(sponsor);
    blockSponsorRepository.saveAndFlush(sponsor);

    ObjectMapper mapper = new ObjectMapper();
    var inputs = mapper.readTree("{\"area\":10.125}");
    var outputs = mapper.readTree("{\"total\":9.125}");
    var warnings = mapper.readTree("[\"rounded\"]");
    BlockCalculationSnapshotEntity snapshot = new BlockCalculationSnapshotEntity(
        savedBlock.getId(), districtVolumeId(), LocalDate.of(2025, Month.JANUARY, 1),
        LocalDate.of(2025, Month.DECEMBER, 31), inputs, outputs, NOW, "HALF_UP", warnings,
        ACTOR, ACTOR, NOW, NOW);
    snapshotRepository.save(snapshot);

    StatusEventEntity event = new StatusEventEntity();
    event.setBlockId(savedBlock.getId());
    event.setStatus("SUBMITTED");
    event.setEventType("SUBMISSION_CREATED");
    event.setDetails(mapper.readTree("{\"source\":\"test\"}"));
    event.setCreatedBy(ACTOR);
    event.setUpdatedBy(ACTOR);
    event.setCreatedAt(NOW);
    event.setUpdatedAt(NOW);
    StatusEventEntity savedEvent = statusEventRepository.save(event);

    assertThat(reportingUnitRepository.findById(savedUnit.getId())).isPresent();
    assertThat(blockRepository.findByReportingUnitIdAndDeletedFalse(savedUnit.getId()))
        .hasValueSatisfying(found -> assertThat(found.getId()).isEqualTo(savedBlock.getId()));
    assertThat(districtAverageBlockRepository.findById(savedBlock.getId()).orElseThrow()
        .getCriteria()).containsExactly(1, 2);
    assertThat(blockMarkRepository.findByBlockIdAndMarkTypeOrderBySequenceNo(
        savedBlock.getId(), "PRIMARY")).extracting(BlockMarkEntity::getMark)
        .containsExactly("A12345");
    assertThat(blockRequirementRepository.findByBlockIdAndDeletedFalse(savedBlock.getId()))
        .extracting(BlockRequirementEntity::getRequirementCode).containsExactly("REQ-1");
    assertThat(snapshotRepository.findById(snapshot.getId()).orElseThrow().getWarnings())
        .isEqualTo(warnings);
    assertThat(statusEventRepository.findById(savedEvent.getId()).orElseThrow().getDetails())
        .isEqualTo(mapper.readTree("{\"source\":\"test\"}"));

    savedBlock.setDeleted(true);
    blockRepository.saveAndFlush(savedBlock);
    assertThat(blockRepository.findByReportingUnitIdAndDeletedFalse(savedUnit.getId()))
        .isEmpty();
  }

  private Long districtVolumeId() {
    return jdbcTemplate.queryForObject(
        "SELECT id FROM hrs.district_volume ORDER BY id LIMIT 1", Long.class);
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

  private void audit(DistrictAverageBlockEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(NOW);
    entity.setUpdatedAt(NOW);
  }

  private void audit(BlockMarkEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(NOW);
    entity.setUpdatedAt(NOW);
  }

  private void audit(BlockAreaSegmentEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(NOW);
    entity.setUpdatedAt(NOW);
  }

  private void audit(BlockAttachmentEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(NOW);
    entity.setUpdatedAt(NOW);
  }

  private void audit(BlockRequirementEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(NOW);
    entity.setUpdatedAt(NOW);
  }

  private void audit(BlockCommentEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(NOW);
    entity.setUpdatedAt(NOW);
  }

  private void audit(BlockSubmitterEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(NOW);
    entity.setUpdatedAt(NOW);
  }

  private void audit(BlockSponsorEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(NOW);
    entity.setUpdatedAt(NOW);
  }

}

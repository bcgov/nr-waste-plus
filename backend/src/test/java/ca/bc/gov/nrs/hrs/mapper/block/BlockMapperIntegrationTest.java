package ca.bc.gov.nrs.hrs.mapper.block;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.dto.block.BlockAreaSegmentDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockAttachmentDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockCommentDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockCreateDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockMarkDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockRequirementDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockSponsorDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockSubmitterDto;
import ca.bc.gov.nrs.hrs.dto.block.DistrictAverageBlockDto;
import ca.bc.gov.nrs.hrs.dto.block.ReportingUnitDto;
import ca.bc.gov.nrs.hrs.dto.block.StatusEventDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockAreaSegmentEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockCommentEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockMarkEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockRequirementEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockSponsorEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockSubmitterEntity;
import ca.bc.gov.nrs.hrs.entity.block.DistrictAverageBlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class BlockMapperIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private BlockMapper blockMapper;

  @Autowired
  private ReportingUnitMapper reportingUnitMapper;

  @Autowired private BlockAreaSegmentMapper blockAreaSegmentMapper;
  @Autowired private BlockAttachmentMapper blockAttachmentMapper;
  @Autowired private BlockCommentMapper blockCommentMapper;
  @Autowired private BlockMarkMapper blockMarkMapper;
  @Autowired private BlockRequirementMapper blockRequirementMapper;
  @Autowired private BlockSponsorMapper blockSponsorMapper;
  @Autowired private BlockSubmitterMapper blockSubmitterMapper;
  @Autowired private DistrictAverageBlockMapper districtAverageBlockMapper;
  @Autowired private StatusEventMapper statusEventMapper;
  @Autowired private BlockCalculationSnapshotMapper snapshotMapper;

  @Test
  void generatedMapperBeans_shouldMapEntityAndDtoValues() {
    var createDto = new BlockCreateDto(42L, "DA", true, LocalDate.of(2026, 8, 31));

    BlockEntity entity = blockMapper.toEntity(createDto);

    assertThat(entity.getReportingUnitId()).isEqualTo(42L);
    assertThat(entity.getBlockType()).isEqualTo("DA");
    assertThat(entity.isDraft()).isTrue();
    assertThat(entity.getPlcDate()).isEqualTo(LocalDate.of(2026, 8, 31));
  }

  @Test
  void generatedMapperBeans_shouldMapNullToNull() {
    assertThat(blockMapper.toDetailDto(null)).isNull();
    assertThat(reportingUnitMapper.toDto(null)).isNull();
    assertThat(reportingUnitMapper.toEntity(null)).isNull();
  }

  @Test
  void reportingUnitMapper_shouldMapMatchingProperties() {
    var entity = new ReportingUnitEntity();
    entity.setId(7L);
    entity.setClientNumber("00001234");
    entity.setClientLocnCode("LOC-1");
    entity.setOrgUnitNo("DCK");
    entity.setRevision(3L);

    ReportingUnitDto dto = reportingUnitMapper.toDto(entity);

    assertThat(dto).isEqualTo(new ReportingUnitDto(7L, "00001234", "LOC-1", "DCK", 3L));
  }

  @Test
  void submissionMappers_shouldMapDtoValuesAndIgnoreGeneratedStatusId() {
    BlockAreaSegmentEntity segment = blockAreaSegmentMapper.toEntity(new BlockAreaSegmentDto(1L,
        2L, "MANUAL", new BigDecimal("10.0"), new BigDecimal("20.0"), new BigDecimal("4.0"),
        3L, new BigDecimal("11.0"), new BigDecimal("9.0")));
    assertThat(blockAreaSegmentMapper.toDto(segment)).isNotNull();
    BlockAttachmentEntity attachment = blockAttachmentMapper.toEntity(new BlockAttachmentDto(1L,
        2L, "key", "file.pdf", "application/pdf", 12L, "CLEAN"));
    assertThat(blockAttachmentMapper.toDto(attachment)).isNotNull();
    BlockCommentEntity comment = blockCommentMapper.toEntity(new BlockCommentDto(1L, 2L,
        "SUBMISSION", "comment", 3L));
    assertThat(blockCommentMapper.toDto(comment)).isNotNull();
    BlockMarkEntity mark = blockMarkMapper.toEntity(new BlockMarkDto(1L, 2L, "PRIMARY", 1,
        "A123", "VALID", "R123", "TM123", "CP123", "CB123"));
    assertThat(blockMarkMapper.toDto(mark)).isNotNull();
    BlockRequirementEntity requirement = blockRequirementMapper.toEntity(new BlockRequirementDto(
        1L, 2L, "REQ-1", true, "yes", 3L));
    assertThat(blockRequirementMapper.toDto(requirement)).isNotNull();
    BlockSponsorEntity sponsor = blockSponsorMapper.toEntity(new BlockSponsorDto(1L, 2L,
        "sponsor", "Sponsor",
        "First", "Last", "RPF", "LIC-1", "sponsor@example.com", "555-0100"));
    assertThat(blockSponsorMapper.toDto(sponsor)).isNotNull();
    BlockSubmitterEntity submitter = blockSubmitterMapper.toEntity(new BlockSubmitterDto(1L, 2L,
        "submitter",
        "Submitter", "First", "Last", "RPF", "LIC-1", "submitter@example.com", "555-0101"));
    assertThat(blockSubmitterMapper.toDto(submitter)).isNotNull();
    DistrictAverageBlockEntity averageBlock = districtAverageBlockMapper.toEntity(
        new DistrictAverageBlockDto(2L, "DRY",
        "MATURE", null, null, null, null, "ACTIVE", "BEC", "SV", true, null, null, null));
    assertThat(districtAverageBlockMapper.toDto(averageBlock)).isNotNull();
    StatusEventEntity event = statusEventMapper.toEntity(new StatusEventDto(99L, 1L, 2L,
        "SUBMITTED", "CREATED", null));
    assertThat(event).isInstanceOf(StatusEventEntity.class);
    assertThat(statusEventMapper.toDto(event)).isNotNull();
    var objectMapper = new ObjectMapper();
    var snapshot = new BlockCalculationSnapshotEntity(2L, 3L, LocalDate.of(2026, 1, 1),
        LocalDate.of(2026, 12, 31), objectMapper.createObjectNode(),
        objectMapper.createObjectNode(),
        Instant.parse("2026-01-01T00:00:00Z"), "HALF_UP", objectMapper.createArrayNode(), "actor",
        "actor", Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z"));
    assertThat(snapshotMapper.toDto(snapshot)).isNotNull();
  }
}

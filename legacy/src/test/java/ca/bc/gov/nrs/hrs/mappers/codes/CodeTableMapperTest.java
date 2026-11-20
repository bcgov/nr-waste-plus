package ca.bc.gov.nrs.hrs.mappers.codes;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.entity.codes.AssessAreaStatusEntity;
import ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity;
import ca.bc.gov.nrs.hrs.entity.codes.SamplingOptionEntity;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class CodeTableMapperTest {

  private final AssessAreaStatusMapper assessAreaStatusMapper = new AssessAreaStatusMapperImpl();
  private final SamplingOptionMapper samplingOptionMapper = new SamplingOptionMapperImpl();
  private final DistrictMapper districtMapper = new DistrictMapperImpl();

  @Test
  void mapsAssessmentStatusToDtoAndBack() {
    AssessAreaStatusEntity entity = AssessAreaStatusEntity.builder()
        .id("APP")
        .description("Approved")
        .build();

    assertThat(assessAreaStatusMapper.toDto(entity))
        .isEqualTo(new CodeDescriptionDto("APP", "Approved"));
    assertThat(assessAreaStatusMapper.toDto(null)).isNull();

    AssessAreaStatusEntity mapped = assessAreaStatusMapper.toEntity(
        new CodeDescriptionDto("RTB", "Return to billing"));
    assertThat(mapped.getId()).isEqualTo("RTB");
    assertThat(mapped.getDescription()).isEqualTo("Return to billing");
    assertThat(mapped.getEffectiveDate()).isNotNull();
    assertThat(mapped.getUpdateTimestamp()).isNotNull();
    assertThat(mapped.getExpiryDate()).isEqualTo(LocalDateTime.MAX);
    assertThat(assessAreaStatusMapper.toEntity(null)).isNull();
  }

  @Test
  void mapsSamplingOptionToDtoAndBack() {
    SamplingOptionEntity entity = SamplingOptionEntity.builder()
        .id("AGR")
        .description("Aggregate")
        .build();

    assertThat(samplingOptionMapper.toDto(entity))
        .isEqualTo(new CodeDescriptionDto("AGR", "Aggregate"));
    assertThat(samplingOptionMapper.toDto(null)).isNull();

    SamplingOptionEntity mapped = samplingOptionMapper.toEntity(
        new CodeDescriptionDto("AGR", "Aggregate"));
    assertThat(mapped.getId()).isEqualTo("AGR");
    assertThat(mapped.getDescription()).isEqualTo("Aggregate");
    assertThat(mapped.getEffectiveDate()).isNotNull();
    assertThat(mapped.getUpdateTimestamp()).isNotNull();
    assertThat(mapped.getExpiryDate()).isEqualTo(LocalDateTime.MAX);
    assertThat(samplingOptionMapper.toEntity(null)).isNull();
  }

  @Test
  void mapsDistrictProjectionAndPreservesNullContract() {
    OrgUnitEntity projection = OrgUnitEntity.builder()
        .orgUnitCode("DSS")
        .orgUnitName("Skeena Stikine")
        .build();

    assertThat(districtMapper.fromProjection(projection))
        .isEqualTo(new CodeDescriptionDto("DSS", "Skeena Stikine"));
    assertThat(districtMapper.fromProjection(null)).isNull();
  }
}

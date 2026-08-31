package ca.bc.gov.nrs.hrs.mapper.block;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.dto.block.BlockCreateDto;
import ca.bc.gov.nrs.hrs.dto.block.ReportingUnitDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class BlockMapperIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private BlockMapper blockMapper;

  @Autowired
  private ReportingUnitMapper reportingUnitMapper;

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
}

package ca.bc.gov.nrs.hrs.entity.block;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@DisplayName("Integrated Test | Reporting Unit ID Generator")
class ReportingUnitIdGeneratorIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private ReportingUnitRepository reportingUnitRepository;

  private Long createdId;

  @AfterEach
  void cleanUp() {
    if (createdId != null) {
      reportingUnitRepository.deleteById(createdId);
      createdId = null;
    }
  }

  @Test
  @DisplayName("Should generate sequence id at or above 1,000,000,000 when id is null")
  void shouldGenerateSequenceIdAboveOneBillion_whenIdIsNull() {
    ReportingUnitEntity entity = new ReportingUnitEntity();
    entity.setClientNumber("00012797");
    entity.setClientLocnCode("00");
    entity.setGeographicCode("DND");
    entity.setSamplingCode("AVG");
    entity.setDeleted(false);
    entity.setCreatedBy("test-generator");
    entity.setUpdatedBy("test-generator");

    ReportingUnitEntity saved = reportingUnitRepository.saveAndFlush(entity);
    createdId = saved.getId();

    assertThat(saved.getId()).isNotNull();
    assertThat(saved.getId()).isGreaterThanOrEqualTo(1_000_000_000L);
  }

  @Test
  @DisplayName("Should preserve assigned id when id is provided")
  void shouldPreserveAssignedId_whenIdIsProvided() {
    ReportingUnitEntity entity = new ReportingUnitEntity();
    entity.setId(998877L);
    entity.setClientNumber("00012797");
    entity.setClientLocnCode("00");
    entity.setGeographicCode("DND");
    entity.setSamplingCode("AVG");
    entity.setDeleted(false);
    entity.setCreatedBy("test-generator");
    entity.setUpdatedBy("test-generator");

    ReportingUnitEntity saved = reportingUnitRepository.saveAndFlush(entity);
    createdId = saved.getId();

    assertThat(saved.getId()).isEqualTo(998877L);
  }
}

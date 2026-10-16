package ca.bc.gov.nrs.hrs.entity.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test | Reporting Unit ID Generator")
class ReportingUnitIdGeneratorTest {

  @Test
  @DisplayName("generate returns pre-assigned id when present on entity")
  void generate_returnsPreAssignedId_whenPresentOnEntity() {
    var generator = new ReportingUnitIdGenerator();
    var session = mock(SharedSessionContractImplementor.class);

    var entity = new ReportingUnitEntity();
    entity.setId(12345L);

    Object generatedId = generator.generate(session, entity);

    assertThat(generatedId).isEqualTo(12345L);
  }

  @Test
  @DisplayName("allowAssignedIdentifiers returns true")
  void allowAssignedIdentifiers_returnsTrue() {
    var generator = new ReportingUnitIdGenerator();
    assertThat(generator.allowAssignedIdentifiers()).isTrue();
  }
}


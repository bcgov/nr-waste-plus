package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.dto.formula.FormulaItemDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetRowEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test | Formula Row Mapper")
class FormulaRowMapperTest {

  @DisplayName("To Set Row Maps All Fields")
  @Test
  void toSetRowMapsAllFields() {
    FormulaItemDto item = new FormulaItemDto("da.mature.volume", "1 + 2", 5);
    FormulaSetRowEntity row = FormulaRowMapper.toSetRow(42L, item);

    assertThat(row.getFormulaSetId()).isEqualTo(42L);
    assertThat(row.getFormulaKey()).isEqualTo("da.mature.volume");
    assertThat(row.getExpression()).isEqualTo("1 + 2");
    assertThat(row.getSortOrder()).isEqualTo(5);
    assertThat(row.isDeleted()).isFalse();
  }
}

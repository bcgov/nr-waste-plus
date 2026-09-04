package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.dto.formula.FormulaItemDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeFormulaEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetRowEntity;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
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

  @DisplayName("To Set Row Initializes Declared Variables As Object Node")
  @Test
  void toSetRowInitializesDeclaredVariablesAsObjectNode() {
    FormulaItemDto item = new FormulaItemDto("da.x", "1", 0);
    FormulaSetRowEntity row = FormulaRowMapper.toSetRow(1L, item);

    assertThat(row.getDeclaredVariables()).isInstanceOf(ObjectNode.class);
    assertThat(row.getDeclaredVariables()).isEmpty();
  }

  @DisplayName("To Set Row Initializes Validation Errors As Array Node")
  @Test
  void toSetRowInitializesValidationErrorsAsArrayNode() {
    FormulaItemDto item = new FormulaItemDto("da.x", "1", 0);
    FormulaSetRowEntity row = FormulaRowMapper.toSetRow(1L, item);

    assertThat(row.getValidationErrors()).isInstanceOf(ArrayNode.class);
    assertThat(row.getValidationErrors()).isEmpty();
  }

  @DisplayName("To Legacy Row Maps All Fields")
  @Test
  void toLegacyRowMapsAllFields() {
    DistrictVolumeEntity volume = new DistrictVolumeEntity();
    ObjectNode declaredVars = JsonNodeFactory.instance.objectNode();
    declaredVars.put("da.x", 1);
    ArrayNode validationErrors = JsonNodeFactory.instance.arrayNode();
    FormulaPersistenceService.FormulaDraft draft =
        new FormulaPersistenceService.FormulaDraft("sc.AL", "3.14", declaredVars, validationErrors, 2);

    DistrictVolumeFormulaEntity formula = FormulaRowMapper.toLegacyRow(volume, draft);

    assertThat(formula.getDistrictVolume()).isSameAs(volume);
    assertThat(formula.getFormulaKey()).isEqualTo("sc.AL");
    assertThat(formula.getExpression()).isEqualTo("3.14");
    assertThat(formula.getDeclaredVariables()).isSameAs(declaredVars);
    assertThat(formula.getValidationErrors()).isSameAs(validationErrors);
    assertThat(formula.getSortOrder()).isEqualTo(2);
  }

  @DisplayName("To Legacy Row Sets Declared Variables")
  @Test
  void toLegacyRowSetsDeclaredVariables() {
    DistrictVolumeEntity volume = new DistrictVolumeEntity();
    ObjectNode vars = JsonNodeFactory.instance.objectNode();
    vars.put("field", "value");
    ArrayNode errors = JsonNodeFactory.instance.arrayNode();
    FormulaPersistenceService.FormulaDraft draft =
        new FormulaPersistenceService.FormulaDraft("da.test", "x + 1", vars, errors, 0);

    DistrictVolumeFormulaEntity formula = FormulaRowMapper.toLegacyRow(volume, draft);

    assertThat(formula.getDeclaredVariables()).isEqualTo(vars);
  }

  @DisplayName("To Legacy Row Sets Validation Errors")
  @Test
  void toLegacyRowSetsValidationErrors() {
    DistrictVolumeEntity volume = new DistrictVolumeEntity();
    ObjectNode vars = JsonNodeFactory.instance.objectNode();
    ArrayNode errors = JsonNodeFactory.instance.arrayNode();
    errors.add("error one");
    FormulaPersistenceService.FormulaDraft draft =
        new FormulaPersistenceService.FormulaDraft("da.test", "x", vars, errors, 0);

    DistrictVolumeFormulaEntity formula = FormulaRowMapper.toLegacyRow(volume, draft);

    assertThat(formula.getValidationErrors()).isEqualTo(errors);
  }
}

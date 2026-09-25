package ca.bc.gov.nrs.hrs.dto.formula;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Pins the serialization contract of {@link FormulaItemDto}: a formula row exposes exactly {@code
 * formulaKey}, {@code expression}, and {@code sortOrder}. The persistence-internal fields {@code
 * declaredVariables} and {@code validationErrors} must never appear in serialized output.
 */
@DisplayName("Unit Test | Formula Item Dto Serialization")
class FormulaItemDtoSerializationTest {

  private static final List<String> exposedFields =
      List.of("formulaKey", "expression", "sortOrder");

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  @DisplayName("Formula item serializes exactly the three exposed fields")
  void formulaItemSerializesExactlyTheExposedFields() throws Exception {
    JsonNode node =
        objectMapper.readTree(
            objectMapper.writeValueAsString(new FormulaItemDto("da.x", "1 + 2", 0)));

    assertThat(fieldNames(node)).containsExactlyInAnyOrderElementsOf(exposedFields);
    assertThat(node.has("declaredVariables")).isFalse();
    assertThat(node.has("validationErrors")).isFalse();
  }

  @Test
  @DisplayName("Formula set response rows omit internal validation state")
  void formulaSetResponseRowsOmitInternalValidationState() throws Exception {
    // Dates are null so this test stays focused on row-field serialization.
    FormulaSetResponse response =
        new FormulaSetResponse(
            7L, Area.COASTAL, null, null, false,
            List.of(new FormulaItemDto("da.x", "1 + 2", 3)));

    JsonNode row =
        objectMapper.readTree(objectMapper.writeValueAsString(response)).path("formulas").path(0);

    assertThat(fieldNames(row)).containsExactlyInAnyOrderElementsOf(exposedFields);
    assertThat(row.path("sortOrder").asInt()).isEqualTo(3);
    assertThat(row.has("declaredVariables")).isFalse();
    assertThat(row.has("validationErrors")).isFalse();
  }

  private static List<String> fieldNames(JsonNode node) {
    List<String> names = new ArrayList<>();
    node.fieldNames().forEachRemaining(names::add);
    return names;
  }
}

package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Executes the language-neutral formula contract against the authoritative backend validator. */
@DisplayName("Unit Test | Formula Conformance Fixture")
class FormulaConformanceFixtureTest {
  private static final ObjectMapper JSON = new ObjectMapper();
  private static final FormulaValidator VALIDATOR =
      new FormulaValidator(new FormulaParser.Options(30, 200));
  private static final Set<String> ALLOWED_STATUSES =
      Set.of("VALID", "INVALID", "PENDING_EVALUATOR");

  @DisplayName("Should match shared fixture contract")
  @Test
  void should_match_shared_fixture_contract() throws IOException {
    JsonNode root = JSON.readTree(Files.readString(fixturePath()));
    assertThat(root.path("contractVersion").asText()).isEqualTo("1.0");
    List<String> namespaces = new ArrayList<>();
    root.path("namespaces").forEach(node -> namespaces.add(node.asText()));
    assertThat(namespaces).containsExactly("da", "sc", "submission", "hbs", "fta");
    assertThat(root.path("diagnosticCodes").size()).isEqualTo(7);
    assertThat(root.path("rounding").path("scale").asInt()).isEqualTo(3);
    assertThat(root.path("rounding").path("mode").asText()).isEqualTo("HALF_UP");
    assertThat(root.path("cases").isArray()).isTrue();

    for (JsonNode fixture : root.path("cases")) {
      assertThat(fixture.path("id").asText()).isNotBlank();
      assertThat(fixture.path("mode").asText()).isIn("MATHEMATICAL", "CONDITIONAL");
      assertThat(fixture.path("variables").isObject()).isTrue();
      assertThat(fixture.has("expression") || fixture.has("definitions"))
          .as(fixture.path("id").asText())
          .isTrue();
      String status = fixture.path("expected").path("status").asText();
      assertThat(fixture.path("expected").isObject()).isTrue();
      assertThat(status).as(fixture.path("id").asText()).isIn(ALLOWED_STATUSES);
      List<FormulaDefinition> definitions = definitionsFor(fixture);
      FormulaParseMode mode = FormulaParseMode.valueOf(fixture.path("mode").asText());
      if ("PENDING_EVALUATOR".equals(status)) {
        assertThat(fixture.path("expected").path("reason").asText()).isNotBlank();
        for (FormulaDefinition definition : definitions) {
          // Pending cases still require parsing; unresolved values are evaluator-pending.
          new FormulaParser(new FormulaParser.Options(30, 200))
              .parse(definition.expression(), mode);
        }
        continue;
      }
      Map<String, BigDecimal> variables = JSON.convertValue(fixture.path("variables"),
          JSON.getTypeFactory().constructMapType(Map.class, String.class, BigDecimal.class));
      List<FormulaValidationError> errors = VALIDATOR.validate(new FormulaValidationRequest(
          definitions, variables, mode));
      assertThat(errors).as(fixture.path("id").asText())
          .hasSameSizeAs(fixture.path("expected").path("errors"));
      for (int index = 0; index < errors.size(); index++) {
        JsonNode expected = fixture.path("expected").path("errors").get(index);
        assertThat(errors.get(index).code().name()).isEqualTo(expected.path("code").asText());
        if (expected.has("startOffset")) {
          assertThat(errors.get(index).startOffset()).as(fixture.path("id").asText())
              .isEqualTo(expected.path("startOffset").asInt());
          assertThat(errors.get(index).endOffset()).as(fixture.path("id").asText())
              .isEqualTo(expected.path("endOffset").asInt());
        }
      }
      if ("VALID".equals(status)) {
        assertThat(errors).isEmpty();
        if (fixture.path("expected").has("ast")) {
          assertAst(definitions.get(0).expression(),
              mode, fixture.path("expected").path("ast"));
        }
      }
    }
  }

  private static Path fixturePath() {
    Path fromBackend = Path.of("..", "shared", "formula-conformance.json");
    return Files.exists(fromBackend) ? fromBackend : Path.of("shared", "formula-conformance.json");
  }

  private static List<FormulaDefinition> definitionsFor(JsonNode fixture) {
    assertThat(fixture.has("expression") ^ fixture.has("definitions"))
        .as(fixture.path("id").asText())
        .isTrue();
    if (fixture.has("definitions")) {
      assertThat(fixture.path("definitions").isArray()).isTrue();
      assertThat(fixture.path("definitions").size()).isPositive();
      List<FormulaDefinition> definitions = new ArrayList<>();
      for (JsonNode definition : fixture.path("definitions")) {
        assertThat(definition.isObject()).isTrue();
        assertThat(definition.path("key").asText()).isNotBlank();
        assertThat(definition.path("expression").asText()).isNotBlank();
        definitions.add(new FormulaDefinition(definition.path("key").asText(),
            definition.path("expression").asText()));
      }
      return definitions;
    }
    assertThat(fixture.path("expression").asText()).isNotBlank();
    return List.of(new FormulaDefinition("fixture", fixture.path("expression").asText()));
  }

  private static void assertAst(String expression, FormulaParseMode mode, JsonNode expected) {
    FormulaNode node = new FormulaParser(new FormulaParser.Options(30, 200)).parse(expression,
        mode);
    assertAstNode(node, expected);
  }

  private static void assertAstNode(FormulaNode node, JsonNode expected) {
    assertThat(node.getClass().getSimpleName().toLowerCase())
        .contains(expected.path("kind").asText());
    if (node instanceof LiteralNode literal) {
      assertThat(literal.value()).isEqualByComparingTo(expected.path("value").asText());
    } else if (node instanceof BinaryOperationNode binary) {
      assertThat(binary.operator().symbol()).isEqualTo(expected.path("operator").asText());
      if (expected.has("left")) {
        assertAstNode(binary.left(), expected.path("left"));
        assertAstNode(binary.right(), expected.path("right"));
      }
    } else if (node instanceof IfNode ifNode) {
      assertAstNode(ifNode.condition(), expected.path("condition"));
      assertAstNode(ifNode.valueIfTrue(), expected.path("trueBranch"));
      assertAstNode(ifNode.valueIfFalse(), expected.path("falseBranch"));
    }
  }

}

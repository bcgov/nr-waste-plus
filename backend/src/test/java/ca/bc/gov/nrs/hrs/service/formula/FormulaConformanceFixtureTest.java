package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Executes the language-neutral formula contract against the authoritative backend validator. */
class FormulaConformanceFixtureTest {
  private static final ObjectMapper JSON = new ObjectMapper();
  private static final FormulaValidator VALIDATOR =
      new FormulaValidator(new FormulaParser.Options(30, 200));

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

    for (JsonNode fixture : root.path("cases")) {
      String status = fixture.path("expected").path("status").asText();
      if ("PENDING_EVALUATOR".equals(status)) {
        assertThat(fixture.path("expected").path("reason").asText()).isNotBlank();
        continue;
      }
      List<FormulaDefinition> definitions;
      if (fixture.has("definitions")) {
        definitions = new ArrayList<>();
        for (JsonNode definition : fixture.path("definitions")) {
          definitions.add(new FormulaDefinition(definition.path("key").asText(),
              definition.path("expression").asText()));
        }
      } else {
        definitions = List.of(new FormulaDefinition("fixture", fixture.path("expression").asText()));
      }
      Map<String, BigDecimal> variables = JSON.convertValue(fixture.path("variables"),
          JSON.getTypeFactory().constructMapType(Map.class, String.class, BigDecimal.class));
      List<FormulaValidationError> errors = VALIDATOR.validate(new FormulaValidationRequest(
          definitions, variables, FormulaParseMode.valueOf(fixture.path("mode").asText())));
      assertThat(errors).as(fixture.path("id").asText()).hasSameSizeAs(fixture.path("expected").path("errors"));
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
              fixture.path("expected").path("ast"));
        }
      }
    }
  }

  private static Path fixturePath() {
    Path fromBackend = Path.of("..", "shared", "formula-conformance.json");
    return Files.exists(fromBackend) ? fromBackend : Path.of("shared", "formula-conformance.json");
  }

  private static void assertAst(String expression, JsonNode expected) {
    FormulaNode node = new FormulaParser(new FormulaParser.Options(30, 200)).parse(expression,
        expression.contains("IF") || expression.contains("if") || expression.contains("If")
            ? FormulaParseMode.CONDITIONAL : FormulaParseMode.MATHEMATICAL);
    assertAstNode(node, expected);
  }

  private static void assertAstNode(FormulaNode node, JsonNode expected) {
    assertThat(node.getClass().getSimpleName().toLowerCase()).contains(expected.path("kind").asText());
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

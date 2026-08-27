package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Tests the fixture contract with a deliberately separate, test-side reference calculation. */
class DistrictAverageParityFixtureTest {

  private static final String FIXTURE_PATH = "/fixtures/district-average/";
  private static final String SCHEMA_NAME = "schema.json";
  private static final BigDecimal ZERO_TICK = new BigDecimal("0.001");
  private static final int CALCULATION_SCALE = 12;
  private static final int DISPLAY_SCALE = 3;
  private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
  private static final JsonMapper JSON_MAPPER = JsonMapper.builder().build();
  private static final List<String> FIXTURE_NAMES = List.of(
      "COAST-IMMATURE-01.json", "COAST-MATURE-HELI-01.json",
      "COAST-RESIDUAL-UNDER-ALLOC-01.json", "INTERIOR-DRY-BELT-01.json",
      "INTERIOR-RESIDUAL-OVER-ALLOC-01.json", "INTERIOR-TRANSITION-DISPERSED-01.json",
      "INTERIOR-TRANSITION-RESIDUAL-01.json", "INTERIOR-WET-BELT-01.json");

  /* These are the known district-table values represented by this fixture model, normalized
     against the fixture benchmark. They are an oracle for the test, not production formula code. */
  private static final Map<String, BigDecimal> DISTRICT_FACTORS = Map.of(
      "DCC|INTERIOR|Dry belt", new BigDecimal("2.2925"),
      "DCS|INTERIOR|Transition", new BigDecimal("3.744"),
      "DKM|INTERIOR|Wet belt", new BigDecimal("3.3995"),
      "DCC|COASTAL|Coast Immature", BigDecimal.ONE,
      "DKM|COASTAL|Coast Mature", new BigDecimal("5.154"),
      "DKM|COASTAL|Coast Mature Heli", new BigDecimal("0.9514285714285714285714285714"));

  @Test
  void fixturesAreExplicitlyDiscoveredAndConformToSchema() throws IOException {
    JsonNode schema = readFixture(SCHEMA_NAME);
    assertThat(schema.path("$schema").asText()).isEqualTo("http://json-schema.org/draft-07/schema#");
    assertThat(schema.path("additionalProperties").asBoolean()).isFalse();

    for (String name : FIXTURE_NAMES) {
      JsonNode fixture = readFixture(name);
      assertFixtureAgainstSchema(fixture, schema, name);
      assertThat(fixture.path("caseId").asText()).isNotBlank();
      assertThat(fixture.path("area").asText()).isIn("INTERIOR", "COASTAL");
      assertThat(fixture.path("workbookReference").asText())
          .matches(".*(Provincial|Manual|Coast) p?[0-9].*");
      assertThat(fixture.path("expected").has("trace")).isFalse();
      assertThat(fixture.path("expected").has("formula")).isFalse();
      assertThat(fixture.path("inputs").has("cell")).isFalse();
      assertThat(fixture.path("inputs").has("range")).isFalse();
      assertThat(fixture.path("expected").has("sheet")).isFalse();
      assertThat(fixture.path("expected").has("citation")).isFalse();
    }
  }

  @Test
  void districtTotalsAreIndependentlyDerivedFromSupportedInputs() throws IOException {
    for (String name : FIXTURE_NAMES) {
      JsonNode fixture = readFixture(name);
      BigDecimal calculated = referenceTotal(fixture);
      JsonNode expected = fixture.get("expected");
      assertThat(calculated).as(name).isEqualByComparingTo(decimal(expected.get("unroundedTotalM3")));
      assertThat(calculated.setScale(DISPLAY_SCALE, ROUNDING))
          .isEqualByComparingTo(decimal(expected.get("roundedTotalM3")));
    }
  }

  @Test
  void residualsConserveEachGradeAfterApplyingToRoundedSpeciesValues() throws IOException {
    for (String name : FIXTURE_NAMES) {
      JsonNode fixture = readFixture(name);
      BigDecimal total = referenceTotal(fixture);
      List<JsonNode> species = nodes(fixture.path("inputs").path("species"));
      BigDecimal allVolume = species.stream().map(node -> decimal(node.get("volumeM3")))
          .reduce(BigDecimal.ZERO, BigDecimal::add);
      Map<String, List<JsonNode>> byGrade = species.stream()
          .collect(Collectors.groupingBy(node -> node.path("grade").asText("U")));
      Map<String, BigDecimal> residuals = residuals(fixture);

      byGrade.forEach((grade, gradeSpecies) -> {
        BigDecimal gradeTotal = total.multiply(gradeSpecies.stream()
            .map(node -> decimal(node.get("volumeM3"))).reduce(BigDecimal.ZERO, BigDecimal::add))
            .divide(allVolume, CALCULATION_SCALE, ROUNDING).setScale(DISPLAY_SCALE, ROUNDING);
        BigDecimal roundedSpecies = gradeSpecies.stream().map(node -> roundedSpeciesValue(
            total, decimal(node.get("volumeM3")), allVolume)).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal residual = residuals.getOrDefault(grade, BigDecimal.ZERO);
        assertThat(roundedSpecies.add(residual)).as("grade %s in %s", grade, name)
            .isEqualByComparingTo(gradeTotal);
      });

      fixture.path("expected").path("residualAllocation").forEach(node -> {
        String grade = node.path("grade").asText("U");
        String code = node.path("species").asText();
        List<JsonNode> gradeSpecies = byGrade.get(grade);
        assertThat(gradeSpecies).isNotNull();
        JsonNode selected = gradeSpecies.stream()
            .filter(speciesNode -> code.equals(speciesNode.path("code").asText()))
            .findFirst().orElseThrow();
        assertThat(selected).isNotNull();
        assertThat(decimal(node.get("residualM3")).remainder(ZERO_TICK))
            .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(code).isEqualTo(selectResidualSpecies(gradeSpecies).path("code").asText());
      });
    }
  }

  @Test
  void speciesAtOrBelowOneThousandthBecomeZeroUsingHalfUp() {
    assertThat(zeroSmallSpecies(new BigDecimal("0.0004"))).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(zeroSmallSpecies(new BigDecimal("0.0005"))).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(zeroSmallSpecies(new BigDecimal("0.0010"))).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(zeroSmallSpecies(new BigDecimal("0.0014"))).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(zeroSmallSpecies(new BigDecimal("0.0015"))).isEqualByComparingTo(new BigDecimal("0.002"));
  }

  @Test
  void equalMaximumSpeciesUseCodeAsDeterministicTieBreaker() {
    JsonNode selected = selectResidualSpecies(List.of(
        JSON_MAPPER.createObjectNode().put("code", "ZZ").put("volumeM3", 10),
        JSON_MAPPER.createObjectNode().put("code", "AA").put("volumeM3", 10)));
    assertThat(selected.path("code").asText()).isEqualTo("AA");
  }

  private static BigDecimal referenceTotal(JsonNode fixture) {
    JsonNode inputs = fixture.path("inputs");
    String key = inputs.path("districtCode").asText() + "|" + fixture.path("area").asText()
        + "|" + inputs.path("benchmark").path("zone")
            .asText(fixture.path("benchmarkZone").asText());
    BigDecimal factor = DISTRICT_FACTORS.get(key);
    assertThat(factor).as("known district factor %s", key).isNotNull();
    BigDecimal total = decimal(inputs.path("benchmark").path("valueM3PerHa"))
        .multiply(decimal(inputs.path("netWasteAreaHa")))
        .multiply(decimal(inputs.path("tableLevelFactor")))
        .multiply(factor);
    if (inputs.path("has_dispersed_retention").asBoolean()) {
      total = total.multiply(BigDecimal.ONE.subtract(decimal(inputs.path("dispersedRetentionPct"))
          .divide(new BigDecimal("100"), CALCULATION_SCALE, ROUNDING)));
    }
    if (inputs.path("heli_logging").asBoolean()) {
      total = total.multiply(decimal(inputs.path("heli_multiplier")));
    }
    return total.setScale(3, ROUNDING);
  }

  private static BigDecimal roundedSpeciesValue(BigDecimal total, BigDecimal volume, BigDecimal allVolume) {
    return zeroSmallSpecies(total.multiply(volume).divide(allVolume, CALCULATION_SCALE, ROUNDING)
        .setScale(DISPLAY_SCALE, ROUNDING));
  }

  private static BigDecimal zeroSmallSpecies(BigDecimal value) {
    BigDecimal rounded = value.setScale(DISPLAY_SCALE, ROUNDING);
    return rounded.compareTo(ZERO_TICK) <= 0 ? BigDecimal.ZERO.setScale(DISPLAY_SCALE) : rounded;
  }

  private static Map<String, BigDecimal> residuals(JsonNode fixture) {
    Map<String, BigDecimal> result = new java.util.HashMap<>();
    fixture.path("expected").path("residualAllocation").forEach(node ->
        result.merge(node.path("grade").asText("U"), decimal(node.get("residualM3")), BigDecimal::add));
    return result;
  }

  private static JsonNode selectResidualSpecies(List<JsonNode> species) {
    return species.stream().max(Comparator.comparing((JsonNode node) -> decimal(node.get("volumeM3")))
        .thenComparing(node -> node.path("code").asText(), Comparator.reverseOrder())).orElseThrow();
  }

  private static List<JsonNode> nodes(JsonNode array) {
    List<JsonNode> nodes = new ArrayList<>();
    array.forEach(nodes::add);
    return nodes;
  }

  private static void assertFixtureAgainstSchema(JsonNode fixture, JsonNode schema, String name) {
    assertObjectMatchesSchema(fixture, schema, name);
    assertObjectMatchesSchema(fixture.path("inputs"), schema.path("properties").path("inputs"), name);
    assertObjectMatchesSchema(fixture.path("expected"), schema.path("properties").path("expected"), name);
    assertThat(fixture.path("inputs").path("species").isArray()).as(name).isTrue();
  }

  private static void assertObjectMatchesSchema(JsonNode value, JsonNode schema, String name) {
    assertThat(value.isObject()).as("object %s", name).isTrue();
    List<String> required = nodes(schema.path("required")).stream().map(JsonNode::asText).toList();
    assertThat(propertyNames(value)).containsAll(required);
    if (!schema.path("additionalProperties").asBoolean(true)) {
      assertThat(propertyNames(schema.path("properties"))).containsAll(propertyNames(value));
    }
  }

  private static List<String> propertyNames(JsonNode object) {
    List<String> names = new ArrayList<>();
    object.properties().forEach(entry -> names.add(entry.getKey()));
    return names;
  }

  private static JsonNode readFixture(String name) throws IOException {
    try (InputStream stream = DistrictAverageParityFixtureTest.class.getResourceAsStream(FIXTURE_PATH + name)) {
      assertThat(stream).as("fixture %s", name).isNotNull();
      return JSON_MAPPER.readTree(stream);
    }
  }

  private static BigDecimal decimal(JsonNode node) {
    return new BigDecimal(node.asText());
  }
}

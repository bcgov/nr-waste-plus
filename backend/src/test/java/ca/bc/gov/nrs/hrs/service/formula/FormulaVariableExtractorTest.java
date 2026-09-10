package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test | Formula Variable Extractor")
class FormulaVariableExtractorTest {

  @DisplayName("Extracts district-average variable")
  @Test
  void extractsDistrictAverageVariable() {
    var result = FormulaVariableExtractor.extract("da.mature.volume", FormulaParseMode.MATHEMATICAL);
    assertThat(result).containsExactly("da.mature.volume");
  }

  @DisplayName("Extracts species-composition variable")
  @Test
  void extractsSpeciesCompositionVariable() {
    var result = FormulaVariableExtractor.extract("sc.AL", FormulaParseMode.MATHEMATICAL);
    assertThat(result).containsExactly("sc.AL");
  }

  @DisplayName("Extracts submission variable")
  @Test
  void extractsSubmissionVariable() {
    var result = FormulaVariableExtractor.extract("submission.date", FormulaParseMode.MATHEMATICAL);
    assertThat(result).containsExactly("submission.date");
  }

  @DisplayName("Extracts hbs variable")
  @Test
  void extractsHbsVariable() {
    var result = FormulaVariableExtractor.extract("hbs.volume", FormulaParseMode.MATHEMATICAL);
    assertThat(result).containsExactly("hbs.volume");
  }

  @DisplayName("Extracts fta variable")
  @Test
  void extractsFtaVariable() {
    var result = FormulaVariableExtractor.extract("fta.adjustment", FormulaParseMode.MATHEMATICAL);
    assertThat(result).containsExactly("fta.adjustment");
  }

  @DisplayName("Deduplicates repeated variables")
  @Test
  void deduplicatesRepeatedVariables() {
    var result = FormulaVariableExtractor.extract(
        "da.mature.volume + da.mature.volume", FormulaParseMode.MATHEMATICAL);
    assertThat(result).containsExactly("da.mature.volume");
  }

  @DisplayName("Ignores non-namespace tokens")
  @Test
  void ignoresNonNamespaceTokens() {
    var result = FormulaVariableExtractor.extract(
        "total + da.mature.volume", FormulaParseMode.MATHEMATICAL);
    assertThat(result).containsExactly("da.mature.volume");
  }

  @DisplayName("Returns empty set for expression with no variables")
  @Test
  void returnsEmptySetForNoVariables() {
    var result = FormulaVariableExtractor.extract("1 + 2", FormulaParseMode.MATHEMATICAL);
    assertThat(result).isEmpty();
  }

  @DisplayName("Extracts multiple variables from expression")
  @Test
  void extractsMultipleVariablesFromExpression() {
    var result = FormulaVariableExtractor.extract(
        "sc.AL + da.mature.volume", FormulaParseMode.MATHEMATICAL);
    assertThat(result).containsExactlyInAnyOrder("sc.AL", "da.mature.volume");
  }

  @DisplayName("Extracts multi-segment paths")
  @Test
  void extractsMultiSegmentPaths() {
    var result = FormulaVariableExtractor.extract(
        "da.group.field.subfield", FormulaParseMode.MATHEMATICAL);
    assertThat(result).containsExactly("da.group.field.subfield");
  }

  @DisplayName("Rejects null expression")
  @Test
  void rejectsNullExpression() {
    assertThatThrownBy(() -> FormulaVariableExtractor.extract(null, FormulaParseMode.MATHEMATICAL))
        .isInstanceOf(NullPointerException.class);
  }

  @DisplayName("Rejects null mode")
  @Test
  void rejectsNullMode() {
    assertThatThrownBy(() -> FormulaVariableExtractor.extract("da.x", null))
        .isInstanceOf(NullPointerException.class);
  }
}

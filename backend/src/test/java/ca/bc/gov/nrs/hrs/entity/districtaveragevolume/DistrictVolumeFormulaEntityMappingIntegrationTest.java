package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeFormulaRepository;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.junit.jupiter.api.DisplayName;

/** PostgreSQL mapping and predecessor-order integration coverage for formulas. */
@WithMockJwt
@DisplayName("Integrated Test | District Volume Formula Entity Mapping")
class DistrictVolumeFormulaEntityMappingIntegrationTest extends AbstractTestContainerIntegrationTest {
  @Autowired private DistrictVolumeRepository districtVolumeRepository;
  @Autowired private DistrictVolumeFormulaRepository formulaRepository;

  @DisplayName("Jsonb Round Trip And Prior Version Ordering")
  @Test
  void jsonbRoundTripAndPriorVersionOrdering() {
    DistrictVolumeEntity previous = volume(LocalDate.of(2020, 1, 1));
    DistrictVolumeEntity current = volume(LocalDate.of(2020, 3, 1));
    districtVolumeRepository.saveAllAndFlush(List.of(previous, current));

    DistrictVolumeFormulaEntity formula = new DistrictVolumeFormulaEntity();
    formula.setDistrictVolume(previous);
    formula.setFormulaKey("config.total");
    formula.setExpression("IF(da.volume > 1, 2.500, 0)");
    formula.setDeclaredVariables(JsonNodeFactory.instance.objectNode().put("da.volume", "m3"));
    formula.setValidationErrors(JsonNodeFactory.instance.arrayNode());
    formula.setSortOrder(2);
    formulaRepository.saveAndFlush(formula);

    var found = formulaRepository.findForPriorVersion(Area.INTERIOR, current.getStartDate());
    assertThat(found).singleElement().satisfies(value -> {
      assertThat(value.getDistrictVolume().getId()).isEqualTo(previous.getId());
      assertThat(value.getExpression()).isEqualTo("IF(da.volume > 1, 2.500, 0)");
      assertThat(value.getDeclaredVariables().get("da.volume").asText()).isEqualTo("m3");
      assertThat(value.getValidationErrors()).isEmpty();
    });
  }

  @DisplayName("Jsonb Round Trip Preserves Diagnostic Content")
  @Test
  void jsonbRoundTripPreservesDiagnosticContent() {
    DistrictVolumeEntity volume = volume(LocalDate.of(2020, 5, 1));
    districtVolumeRepository.saveAndFlush(volume);
    DistrictVolumeFormulaEntity formula = new DistrictVolumeFormulaEntity();
    formula.setDistrictVolume(volume);
    formula.setFormulaKey("config.diagnostic");
    formula.setExpression("IF(da.rate >= 2, 10, broken.value)");
    formula.setDeclaredVariables(JsonNodeFactory.instance.objectNode()
        .put("da.rate", "numeric").put("submission.area", "numeric"));
    formula.setValidationErrors(JsonNodeFactory.instance.arrayNode().add(
        JsonNodeFactory.instance.objectNode().put("code", "UNKNOWN_VARIABLE")
            .put("message", "Unknown variable: broken.value").put("startOffset", 23)
            .put("endOffset", 35)));
    formula.setSortOrder(0);

    DistrictVolumeFormulaEntity saved = formulaRepository.saveAndFlush(formula);
    DistrictVolumeFormulaEntity reloaded = formulaRepository.findById(saved.getId()).orElseThrow();

    assertThat(reloaded.getDeclaredVariables().get("da.rate").asText()).isEqualTo("numeric");
    assertThat(reloaded.getDeclaredVariables().get("submission.area").asText())
        .isEqualTo("numeric");
    assertThat(reloaded.getValidationErrors()).singleElement().satisfies(error -> {
      assertThat(error.get("code").asText()).isEqualTo("UNKNOWN_VARIABLE");
      assertThat(error.get("message").asText()).isEqualTo("Unknown variable: broken.value");
      assertThat(error.get("startOffset").asInt()).isEqualTo(23);
      assertThat(error.get("endOffset").asInt()).isEqualTo(35);
    });
  }

  @DisplayName("Database Rejects Negative Sort Order")
  @Test
  void databaseRejectsNegativeSortOrder() {
    DistrictVolumeEntity volume = volume(LocalDate.of(2020, 6, 1));
    districtVolumeRepository.saveAndFlush(volume);
    DistrictVolumeFormulaEntity formula = new DistrictVolumeFormulaEntity();
    formula.setDistrictVolume(volume);
    formula.setFormulaKey("config.invalid-order");
    formula.setExpression("1");
    formula.setSortOrder(-1);

    assertThatThrownBy(() -> formulaRepository.saveAndFlush(formula))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @DisplayName("Database Rejects Duplicate Formula Key For One Version")
  @Test
  void databaseRejectsDuplicateFormulaKeyForOneVersion() {
    DistrictVolumeEntity volume = volume(LocalDate.of(2020, 7, 1));
    districtVolumeRepository.saveAndFlush(volume);
    DistrictVolumeFormulaEntity first = formula(volume, "config.duplicate", 0);
    formulaRepository.saveAndFlush(first);
    DistrictVolumeFormulaEntity duplicate = formula(volume, "config.duplicate", 1);

    assertThatThrownBy(() -> formulaRepository.saveAndFlush(duplicate))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @DisplayName("Database Rejects Formula Without District Volume")
  @Test
  void databaseRejectsFormulaWithoutDistrictVolume() {
    DistrictVolumeFormulaEntity formula = formula(null, "config.orphan", 0);

    assertThatThrownBy(() -> formulaRepository.saveAndFlush(formula))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  private DistrictVolumeFormulaEntity formula(DistrictVolumeEntity volume, String key, int order) {
    DistrictVolumeFormulaEntity formula = new DistrictVolumeFormulaEntity();
    formula.setDistrictVolume(volume);
    formula.setFormulaKey(key);
    formula.setExpression("1");
    formula.setSortOrder(order);
    return formula;
  }

  private DistrictVolumeEntity volume(LocalDate startDate) {
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setArea(Area.INTERIOR);
    entity.setStartDate(startDate);
    entity.setEndDate(startDate.plusDays(1));
    entity.setTableData(new TableData(List.of(), null, null, java.util.Map.of()));
    entity.setTableLevelFactor(new BigDecimal("1.000"));
    return entity;
  }
}

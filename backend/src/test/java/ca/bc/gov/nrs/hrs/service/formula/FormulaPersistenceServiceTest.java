package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeFormulaEntity;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeFormulaRepository;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.api.DisplayName;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Formula Persistence Service")
class FormulaPersistenceServiceTest {
  @Mock private DistrictVolumeFormulaRepository formulaRepository;
  @Mock private DistrictVolumeRepository districtVolumeRepository;
  @InjectMocks private FormulaPersistenceService service;

  @DisplayName("Carry Forward Returns Prior Version Formulas")
  @Test
  void carryForwardReturnsPriorVersionFormulas() {
    DistrictVolumeFormulaEntity entity = new DistrictVolumeFormulaEntity();
    entity.setFormulaKey("da.mature.avoidableGradeY");
    entity.setExpression("da.mature.avoidableGradeY");
    entity.setDeclaredVariables(JsonNodeFactory.instance.objectNode());
    entity.setSortOrder(0);
    when(formulaRepository.findForPriorVersion(Area.COASTAL, LocalDate.of(2026, 1, 1)))
        .thenReturn(List.of(entity));

    List<FormulaPersistenceService.FormulaDraft> drafts =
        service.carryForward(Area.COASTAL, LocalDate.of(2026, 1, 1));

    assertThat(drafts).singleElement().satisfies(draft -> {
      assertThat(draft.formulaKey()).isEqualTo("da.mature.avoidableGradeY");
      assertThat(draft.expression()).isEqualTo("da.mature.avoidableGradeY");
      assertThat(draft.sortOrder()).isZero();
      assertThat(draft.validationErrors()).isEmpty();
    });
  }

  @DisplayName("Carry Forward Rejects Null Area")
  @Test
  void carryForwardRejectsNullArea() {
    assertThatThrownBy(() -> service.carryForward(null, LocalDate.now()))
        .isInstanceOf(NullPointerException.class);
  }

  @DisplayName("Carry Forward Rejects Null Target Start Date")
  @Test
  void carryForwardRejectsNullTargetStartDate() {
    assertThatThrownBy(() -> service.carryForward(Area.COASTAL, null))
        .isInstanceOf(NullPointerException.class);
  }

  @DisplayName("Save Validated Persists Drafts Successfully")
  @Test
  void saveValidatedPersistsDraftsSuccessfully() {
    DistrictVolumeEntity volume = volume(ConfigType.DISTRICT_VOLUME,
        LocalDate.now().plusDays(1), null);
    when(districtVolumeRepository.findByIdAndConfigType(1L, ConfigType.DISTRICT_VOLUME))
        .thenReturn(Optional.of(volume));
    when(formulaRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    FormulaPersistenceService.FormulaDraft draft = draft("da.mature.field", "1", 0);
    List<DistrictVolumeFormulaEntity> result = service.saveValidated(1L, List.of(draft));

    assertThat(result).singleElement().satisfies(entity -> {
      assertThat(entity.getFormulaKey()).isEqualTo("da.mature.field");
      assertThat(entity.getExpression()).isEqualTo("1");
      assertThat(entity.getSortOrder()).isZero();
    });
    verify(formulaRepository).saveAll(any());
  }

  @DisplayName("Save Validated Throws When Volume Not Found")
  @Test
  void saveValidatedThrowsWhenVolumeNotFound() {
    when(districtVolumeRepository.findByIdAndConfigType(99L, ConfigType.DISTRICT_VOLUME))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.saveValidated(99L, List.of(draft("k", "1", 0))))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("not found");
  }

  @DisplayName("Save Validated Rejects Active Read Only Volume")
  @Test
  void saveValidatedRejectsActiveReadOnlyVolume() {
    DistrictVolumeEntity volume = volume(ConfigType.DISTRICT_VOLUME,
        LocalDate.of(2020, 1, 1), null);
    when(districtVolumeRepository.findByIdAndConfigType(2L, ConfigType.DISTRICT_VOLUME))
        .thenReturn(Optional.of(volume));

    assertThatThrownBy(() -> service.saveValidated(2L, List.of(draft("k", "1", 0))))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("read-only");
  }

  @DisplayName("Save Validated Rejects Drafts With Validation Errors")
  @Test
  void saveValidatedRejectsDraftsWithValidationErrors() {
    DistrictVolumeEntity volume = volume(ConfigType.DISTRICT_VOLUME,
        LocalDate.of(2099, 1, 1), null);
    when(districtVolumeRepository.findByIdAndConfigType(3L, ConfigType.DISTRICT_VOLUME))
        .thenReturn(Optional.of(volume));

    ArrayNode errors = JsonNodeFactory.instance.arrayNode();
    errors.add(JsonNodeFactory.instance.objectNode().put("code", "SYNTAX_ERROR"));
    FormulaPersistenceService.FormulaDraft badDraft =
        new FormulaPersistenceService.FormulaDraft("k", "1",
            JsonNodeFactory.instance.objectNode(), errors, 0);

    assertThatThrownBy(() -> service.saveValidated(3L, List.of(badDraft)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("validation errors");
  }

  @DisplayName("Formula Draft Rejects Blank Key")
  @Test
  void formulaDraftRejectsBlankKey() {
    assertThatThrownBy(() -> draft("", "1", 0))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @DisplayName("Formula Draft Rejects Blank Expression")
  @Test
  void formulaDraftRejectsBlankExpression() {
    assertThatThrownBy(() -> draft("k", "  ", 0))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @DisplayName("Formula Draft Rejects Negative Sort Order")
  @Test
  void formulaDraftRejectsNegativeSortOrder() {
    assertThatThrownBy(() -> draft("k", "1", -1))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @DisplayName("Formula Draft Rejects Non Array Validation Errors")
  @Test
  void formulaDraftRejectsNonArrayValidationErrors() {
    ObjectNode nonArray = JsonNodeFactory.instance.objectNode();
    assertThatThrownBy(() ->
        new FormulaPersistenceService.FormulaDraft("k", "1",
            JsonNodeFactory.instance.objectNode(), nonArray, 0))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private DistrictVolumeEntity volume(ConfigType type, LocalDate startDate, LocalDate endDate) {
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setConfigType(type);
    entity.setArea(Area.COASTAL);
    entity.setStartDate(startDate);
    entity.setEndDate(endDate);
    return entity;
  }

  private FormulaPersistenceService.FormulaDraft draft(String key, String expression, int order) {
    return new FormulaPersistenceService.FormulaDraft(key, expression,
        JsonNodeFactory.instance.objectNode(), JsonNodeFactory.instance.arrayNode(), order);
  }
}

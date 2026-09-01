package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.anyList;
import static org.mockito.Mockito.verifyNoInteractions;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeFormulaEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeFormulaRepository;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class FormulaPersistenceServiceTest {
  @Mock private DistrictVolumeFormulaRepository formulaRepository;
  @Mock private DistrictVolumeRepository districtVolumeRepository;
  @InjectMocks private FormulaPersistenceService service;

  @Test
  void carryForwardCopiesValuesClearsErrorsAndDoesNotSave() {
    DistrictVolumeFormulaEntity source = new DistrictVolumeFormulaEntity();
    source.setFormulaKey("config.total");
    source.setExpression("da.volume * 2");
    source.setDeclaredVariables(JsonNodeFactory.instance.objectNode().put("unit", "m3"));
    source.setValidationErrors(JsonNodeFactory.instance.arrayNode().add("old"));
    source.setSortOrder(4);
    when(formulaRepository.findForPriorVersion(Area.INTERIOR, LocalDate.of(2099, 1, 1)))
        .thenReturn(List.of(source));

    List<FormulaPersistenceService.FormulaDraft> result =
        service.carryForward(Area.INTERIOR, LocalDate.of(2099, 1, 1));

    assertThat(result).singleElement().satisfies(draft -> {
      assertThat(draft.formulaKey()).isEqualTo("config.total");
      assertThat(draft.expression()).isEqualTo("da.volume * 2");
      assertThat(draft.declaredVariables()).isEqualTo(source.getDeclaredVariables());
      assertThat(draft.validationErrors()).isEmpty();
      assertThat(draft.sortOrder()).isEqualTo(4);
    });
    verify(formulaRepository, never()).saveAll(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void invalidBatchIsRejectedBeforePersistence() {
    DistrictVolumeEntity version = version(1L, LocalDate.of(2099, 1, 1), null);
    when(districtVolumeRepository.findByIdAndConfigType(1L, ConfigType.DISTRICT_VOLUME))
        .thenReturn(Optional.of(version));
    var invalid = new FormulaPersistenceService.FormulaDraft("config.x", "1",
        JsonNodeFactory.instance.objectNode(), JsonNodeFactory.instance.arrayNode().add("bad"), 0);

    assertThatThrownBy(() -> service.saveValidated(1L, List.of(invalid)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("validation errors");
    verify(formulaRepository, never()).saveAll(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void validBatchIsSavedAtomically() {
    DistrictVolumeEntity version = version(1L, LocalDate.of(2099, 1, 1), null);
    when(districtVolumeRepository.findByIdAndConfigType(1L, ConfigType.DISTRICT_VOLUME))
        .thenReturn(Optional.of(version));
    var draft = draft("config.x", 0);
    when(formulaRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

    assertThat(service.saveValidated(1L, List.of(draft))).hasSize(1)
        .first().extracting("formulaKey").isEqualTo("config.x");
    verify(formulaRepository).saveAll(anyList());
  }

  @Test
  void emptyBatchIsSavedWithoutFormulaRows() {
    DistrictVolumeEntity version = version(1L, LocalDate.of(2099, 1, 1), null);
    when(districtVolumeRepository.findByIdAndConfigType(1L, ConfigType.DISTRICT_VOLUME))
        .thenReturn(Optional.of(version));
    when(formulaRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

    assertThat(service.saveValidated(1L, List.of())).isEmpty();
    verify(formulaRepository).saveAll(anyList());
  }

  @Test
  void noPriorVersionReturnsEmptyDraftList() {
    when(formulaRepository.findForPriorVersion(Area.COASTAL, LocalDate.of(2099, 1, 1)))
        .thenReturn(List.of());

    assertThat(service.carryForward(Area.COASTAL, LocalDate.of(2099, 1, 1))).isEmpty();
  }

  @Test
  void carryForwardRejectsNullBoundaryInputsBeforeRepositoryAccess() {
    assertThatThrownBy(() -> service.carryForward(null, LocalDate.of(2099, 1, 1)))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> service.carryForward(Area.INTERIOR, null))
        .isInstanceOf(NullPointerException.class);
    verifyNoInteractions(formulaRepository);
  }

  @Test
  void saveValidatedRejectsMissingDistrictVolumeWithoutWriting() {
    when(districtVolumeRepository.findByIdAndConfigType(99L, ConfigType.DISTRICT_VOLUME))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.saveValidated(99L, List.of(draft("config.x", 0))))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("District volume record not found");
    verify(formulaRepository, never()).saveAll(anyList());
  }

  @Test
  void formulaDraftRejectsNullAndNonArrayDiagnosticsAtBoundary() {
    assertThatThrownBy(() -> new FormulaPersistenceService.FormulaDraft(
        "config.x", "1", JsonNodeFactory.instance.objectNode(), null, 0))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> new FormulaPersistenceService.FormulaDraft(
        "config.x", "1", JsonNodeFactory.instance.objectNode(),
        JsonNodeFactory.instance.objectNode(), 0))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new FormulaPersistenceService.FormulaDraft(
        "config.x", "1", JsonNodeFactory.instance.objectNode(),
        JsonNodeFactory.instance.arrayNode(), -1))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void activeVersionIsRejectedWithCompleteState() {
    DistrictVolumeEntity version = version(1L, LocalDate.of(2020, 1, 1), null);
    version.setArea(Area.INTERIOR);
    version.setConfigType(ConfigType.DISTRICT_VOLUME);
    version.setDeleted(false);
    when(districtVolumeRepository.findByIdAndConfigType(1L, ConfigType.DISTRICT_VOLUME))
        .thenReturn(Optional.of(version));

    assertThatThrownBy(() -> service.saveValidated(1L, List.of(draft("config.x", 0))))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("read-only");
    verify(formulaRepository, never()).saveAll(anyList());
  }

  private FormulaPersistenceService.FormulaDraft draft(String key, int order) {
    return new FormulaPersistenceService.FormulaDraft(key, "1",
        JsonNodeFactory.instance.objectNode().put("value", 1),
        JsonNodeFactory.instance.arrayNode(), order);
  }

  private DistrictVolumeEntity version(Long id, LocalDate start, LocalDate end) {
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setId(id);
    entity.setStartDate(start);
    entity.setEndDate(end);
    return entity;
  }
}

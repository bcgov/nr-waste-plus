package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetRowEntity;
import ca.bc.gov.nrs.hrs.repository.FormulaSetRepository;
import ca.bc.gov.nrs.hrs.repository.FormulaSetRowRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Formula Evaluation Service")
class FormulaEvaluationServiceTest {
  @Mock private FormulaRuntimeResolver runtimeResolver;
  @Mock private BlockCalculationSnapshotRepository snapshotRepository;
  @Mock private FormulaSetRepository setRepository;
  @Mock private FormulaSetRowRepository rowRepository;
  @InjectMocks private FormulaEvaluationService service;

  private static final LocalDate DATE = LocalDate.of(2025, 7, 1);
  private static final String DISTRICT = "DCC";
  private static final String USER = "test-user";

  @DisplayName("Should evaluate simple formula and persist snapshot")
  @Test
  void should_evaluate_and_persist_snapshot() {
    FormulaSetEntity set = formulaSet(1L);
    FormulaSetRowEntity row = formulaRow(1L, 1L, "config.total", "da.mature.total");

    when(setRepository.findEffective(Area.COASTAL, DATE)).thenReturn(Optional.of(set));
    when(rowRepository.findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(1L))
        .thenReturn(List.of(row));
    when(runtimeResolver.resolve(DATE, Area.COASTAL, DISTRICT, "da.mature.total"))
        .thenReturn(new BigDecimal("11.530"));
    when(snapshotRepository.save(any())).thenAnswer(invocation -> {
      BlockCalculationSnapshotEntity e = invocation.getArgument(0);
      return e;
    });

    FormulaEvaluationResult result = service.evaluate(
        100L, 200L, DATE, Area.COASTAL, DISTRICT, USER);

    assertThat(result.outputs()).containsEntry("config.total",
        new BigDecimal("11.530"));

    ArgumentCaptor<BlockCalculationSnapshotEntity> captor =
        ArgumentCaptor.forClass(BlockCalculationSnapshotEntity.class);
    verify(snapshotRepository).save(captor.capture());
    BlockCalculationSnapshotEntity snapshot = captor.getValue();
    assertThat(snapshot.getBlockId()).isEqualTo(100L);
    assertThat(snapshot.getDistrictVolumeId()).isEqualTo(200L);
    assertThat(snapshot.getRoundingPolicy()).isEqualTo("HALF_UP");
    assertThat(snapshot.getInputs()).isNotNull();
    assertThat(snapshot.getOutputs()).isNotNull();
  }

  @DisplayName("Should throw when no formula set is effective")
  @Test
  void should_throw_when_no_formula_set_effective() {
    when(setRepository.findEffective(Area.COASTAL, DATE)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.evaluate(
        100L, 200L, DATE, Area.COASTAL, DISTRICT, USER))
        .isInstanceOf(FormulaEvaluationException.class)
        .hasMessageContaining("No formula set is effective");
  }

  @DisplayName("Should throw when formula set has no active rows")
  @Test
  void should_throw_when_no_active_rows() {
    FormulaSetEntity set = formulaSet(1L);
    when(setRepository.findEffective(Area.COASTAL, DATE)).thenReturn(Optional.of(set));
    when(rowRepository.findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(1L))
        .thenReturn(List.of());

    assertThatThrownBy(() -> service.evaluate(
        100L, 200L, DATE, Area.COASTAL, DISTRICT, USER))
        .isInstanceOf(FormulaEvaluationException.class)
        .hasMessageContaining("no active rows");
  }

  @DisplayName("Should propagate resolver failure for missing district")
  @Test
  void should_propagate_resolver_failure() {
    FormulaSetEntity set = formulaSet(1L);
    FormulaSetRowEntity row = formulaRow(1L, 1L, "da.mature.total", "da.mature.total");

    when(setRepository.findEffective(Area.COASTAL, DATE)).thenReturn(Optional.of(set));
    when(rowRepository.findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(1L))
        .thenReturn(List.of(row));
    when(runtimeResolver.resolve(DATE, Area.COASTAL, DISTRICT, "da.mature.total"))
        .thenThrow(new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.UNPROCESSABLE_CONTENT,
            "District 'DCC' is missing for da.mature.total."));

    assertThatThrownBy(() -> service.evaluate(
        100L, 200L, DATE, Area.COASTAL, DISTRICT, USER))
        .isInstanceOf(FormulaEvaluationException.class)
        .hasMessageContaining("Failed to resolve variable da.mature.total");
  }

  @DisplayName("Should resolve hbs and fta as zero (no-op)")
  @Test
  void should_resolve_hbs_fta_as_zero() {
    FormulaSetEntity set = formulaSet(1L);
    FormulaSetRowEntity row = formulaRow(1L, 1L, "config.total", "hbs.factor + fta.rate");

    when(setRepository.findEffective(Area.COASTAL, DATE)).thenReturn(Optional.of(set));
    when(rowRepository.findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(1L))
        .thenReturn(List.of(row));
    when(snapshotRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    FormulaEvaluationResult result = service.evaluate(
        100L, 200L, DATE, Area.COASTAL, DISTRICT, USER);

    assertThat(result.outputs().get("config.total"))
        .isEqualByComparingTo(BigDecimal.ZERO);
  }

  @DisplayName("Should resolve submission as zero (placeholder)")
  @Test
  void should_resolve_submission_as_zero() {
    FormulaSetEntity set = formulaSet(1L);
    FormulaSetRowEntity row = formulaRow(1L, 1L, "config.total", "submission.area");

    when(setRepository.findEffective(Area.COASTAL, DATE)).thenReturn(Optional.of(set));
    when(rowRepository.findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(1L))
        .thenReturn(List.of(row));
    when(snapshotRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    FormulaEvaluationResult result = service.evaluate(
        100L, 200L, DATE, Area.COASTAL, DISTRICT, USER);

    assertThat(result.outputs().get("config.total"))
        .isEqualByComparingTo(BigDecimal.ZERO);
  }

  @DisplayName("Should evaluate multiple formulas in sort order")
  @Test
  void should_evaluate_multiple_formulas() {
    FormulaSetEntity set = formulaSet(1L);
    FormulaSetRowEntity row1 = formulaRow(1L, 1L, "config.a", "1 + 2");
    FormulaSetRowEntity row2 = formulaRow(2L, 1L, "config.b", "da.x * 3");

    when(setRepository.findEffective(Area.COASTAL, DATE)).thenReturn(Optional.of(set));
    when(rowRepository.findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(1L))
        .thenReturn(List.of(row1, row2));
    when(runtimeResolver.resolve(DATE, Area.COASTAL, DISTRICT, "da.x"))
        .thenReturn(new BigDecimal("4"));
    when(snapshotRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    FormulaEvaluationResult result = service.evaluate(
        100L, 200L, DATE, Area.COASTAL, DISTRICT, USER);

    assertThat(result.outputs()).hasSize(2);
    assertThat(result.outputs()).containsEntry("config.a", new BigDecimal("3.000"));
    assertThat(result.outputs()).containsEntry("config.b", new BigDecimal("12.000"));
  }

  private FormulaSetEntity formulaSet(Long id) {
    FormulaSetEntity set = new FormulaSetEntity();
    set.setId(id);
    set.setArea(Area.COASTAL);
    set.setStartDate(DATE.minusMonths(6));
    set.setEndDate(null);
    set.setDeleted(false);
    return set;
  }

  private FormulaSetRowEntity formulaRow(Long id, Long setId, String key, String expression) {
    FormulaSetRowEntity row = new FormulaSetRowEntity();
    row.setId(id);
    row.setFormulaSetId(setId);
    row.setFormulaKey(key);
    row.setExpression(expression);
    row.setSortOrder(0);
    row.setDeleted(false);
    return row;
  }
}

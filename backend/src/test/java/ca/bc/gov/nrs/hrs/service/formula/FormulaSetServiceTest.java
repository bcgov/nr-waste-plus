package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.formula.FormulaItemDto;
import ca.bc.gov.nrs.hrs.dto.formula.FormulaSetRequest;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetRowEntity;
import ca.bc.gov.nrs.hrs.repository.FormulaSetRepository;
import ca.bc.gov.nrs.hrs.repository.FormulaSetRowRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FormulaSetServiceTest {
  @Mock private FormulaSetRepository setRepository;
  @Mock private FormulaSetRowRepository rowRepository;
  @Mock private FormulaValidationService validationService;
  @InjectMocks private FormulaSetService service;

  @Test
  void updateChangesRowsWithoutCallingPhysicalDelete() {
    FormulaSetEntity set = futureSet(1L, null);
    when(setRepository.findById(1L)).thenReturn(Optional.of(set));
    when(validationService.validateForSave(any())).thenReturn(List.of());
    when(rowRepository.findByFormulaSetIdOrderBySortOrderAscIdAsc(1L))
        .thenReturn(List.of());
    when(rowRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    service.update(1L, request("da.anything", "1"));

    verify(rowRepository).saveAll(any());
  }

  @Test
  void updateReusesSoftDeletedRowWhenFormulaKeyIsReintroduced() {
    FormulaSetEntity set = futureSet(6L, null);
    FormulaSetRowEntity deleted = new FormulaSetRowEntity();
    deleted.setFormulaKey("da.reintroduced");
    deleted.setDeleted(true);
    deleted.setExpression("old");
    when(setRepository.findById(6L)).thenReturn(Optional.of(set));
    when(validationService.validateForSave(any())).thenReturn(List.of());
    when(rowRepository.findByFormulaSetIdOrderBySortOrderAscIdAsc(6L))
        .thenReturn(List.of(deleted));
    when(rowRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    service.update(6L, request("da.reintroduced", "1"));

    assertThat(deleted.isDeleted()).isFalse();
    assertThat(deleted.getExpression()).isEqualTo("1");
    verify(rowRepository).saveAll(any());
  }

  @Test
  void effectiveReadsDateAndAreaAndReturnsDefinitions() {
    FormulaSetEntity set = futureSet(2L, null);
    when(setRepository.findEffective(Area.COASTAL, LocalDate.of(2026, 11, 3)))
        .thenReturn(Optional.of(set));
    FormulaSetRowEntity row = new FormulaSetRowEntity();
    row.setFormulaKey("da.anything");
    when(rowRepository.findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(2L))
        .thenReturn(List.of(row));

    assertThat(service.effective(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI")
        .formulas()).singleElement().extracting(FormulaItemDto::formulaKey)
        .isEqualTo("da.anything");
  }

  @Test
  void invalidExpressionDoesNotPersistRows() {
    FormulaSetEntity set = futureSet(3L, null);
    when(setRepository.findById(3L)).thenReturn(Optional.of(set));
    when(validationService.validateForSave(any())).thenReturn(List.of(
        new FormulaValidationError(FormulaValidationError.Code.SYNTAX_ERROR, "bad", 0, 1)));

    assertThatThrownBy(() -> service.update(3L, request("da.anything", "bad")))
        .hasMessageContaining("bad");
    verify(rowRepository, org.mockito.Mockito.never()).saveAll(any());
  }

  @Test
  void deleteSoftDeletesAndReopensPredecessor() {
    FormulaSetEntity set = futureSet(4L, null);
    FormulaSetEntity predecessor = futureSet(5L, LocalDate.of(2026, 12, 31));
    when(setRepository.findById(4L)).thenReturn(Optional.of(set));
    when(setRepository.findPredecessors(Area.COASTAL, set.getStartDate()))
        .thenReturn(List.of(predecessor));

    service.delete(4L);

    assertThat(set.isDeleted()).isTrue();
    assertThat(predecessor.getEndDate()).isNull();
    verify(setRepository).save(set);
    verify(setRepository).save(predecessor);
  }

  private FormulaSetRequest request(String key, String expression) {
    return new FormulaSetRequest(Area.COASTAL, LocalDate.now().plusDays(5),
        List.of(new FormulaItemDto(key, expression, 0)));
  }

  private FormulaSetEntity futureSet(Long id, LocalDate endDate) {
    FormulaSetEntity set = new FormulaSetEntity();
    set.setId(id);
    set.setArea(Area.COASTAL);
    set.setStartDate(LocalDate.now().plusDays(5));
    set.setEndDate(endDate);
    return set;
  }
}

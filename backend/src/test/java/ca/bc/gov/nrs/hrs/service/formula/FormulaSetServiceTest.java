package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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
import org.junit.jupiter.api.DisplayName;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Formula Set Service")
class FormulaSetServiceTest {
  @Mock private FormulaSetRepository setRepository;
  @Mock private FormulaSetRowRepository rowRepository;
  @Mock private FormulaValidationService validationService;
  @InjectMocks private FormulaSetService service;

  @DisplayName("Update Changes Rows Without Calling Physical Delete")
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

  @DisplayName("Update Reuses Soft Deleted Row When Formula Key Is Reintroduced")
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

  @DisplayName("Effective Reads Date And Area And Returns Definitions")
  @Test
  void effectiveReadsDateAndAreaAndReturnsDefinitions() {
    FormulaSetEntity set = futureSet(2L, null);
    when(setRepository.findEffective(Area.COASTAL, LocalDate.of(2026, 11, 3)))
        .thenReturn(Optional.of(set));
    FormulaSetRowEntity row = new FormulaSetRowEntity();
    row.setFormulaKey("da.anything");
    when(rowRepository.findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(2L))
        .thenReturn(List.of(row));

    assertThat(service.effective(LocalDate.of(2026, 11, 3), Area.COASTAL)
        .formulas()).singleElement().extracting(FormulaItemDto::formulaKey)
        .isEqualTo("da.anything");
  }

  @DisplayName("Invalid Expression Does Not Persist Rows")
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

  @DisplayName("Delete Soft Deletes And Reopens Predecessor")
  @Test
  void deleteSoftDeletesAndReopensPredecessor() {
    FormulaSetEntity set = futureSet(4L, null);
    FormulaSetEntity predecessor = futureSet(5L, LocalDate.of(2026, 12, 31));
    when(setRepository.findById(4L)).thenReturn(Optional.of(set));
    when(setRepository.findPredecessorForReopen(Area.COASTAL, set.getStartDate()))
        .thenReturn(List.of(predecessor));

    service.delete(4L);

    assertThat(set.isDeleted()).isTrue();
    assertThat(predecessor.getEndDate()).isNull();
    verify(setRepository).save(set);
    verify(setRepository).save(predecessor);
  }

  @DisplayName("Delete Reopens Predecessor Closed By Create")
  @Test
  void deleteReopensPredecessorClosedByCreate() {
    FormulaSetEntity set = futureSet(7L, null);
    FormulaSetEntity predecessor = futureSet(8L, LocalDate.of(2026, 11, 30));
    when(setRepository.findById(7L)).thenReturn(Optional.of(set));
    when(setRepository.findPredecessorForReopen(Area.COASTAL, set.getStartDate()))
        .thenReturn(List.of(predecessor));

    service.delete(7L);

    assertThat(set.isDeleted()).isTrue();
    assertThat(predecessor.getEndDate()).isNull();
    verify(setRepository).save(set);
    verify(setRepository).save(predecessor);
  }

  @DisplayName("Create Rejects Past Date")
  @Test
  void createRejectsPastDate() {
    FormulaSetRequest pastRequest = new FormulaSetRequest(Area.COASTAL,
        LocalDate.now().minusDays(1),
        List.of(new FormulaItemDto("da.x", "1", 0)));

    assertThatThrownBy(() -> service.create(pastRequest))
        .hasMessageContaining("future");
  }

  @DisplayName("Create Rejects Duplicate Open-Ended Future Set")
  @Test
  void createRejectsDuplicateOpenEndedFutureSet() {
    FormulaSetEntity openEnded = futureSet(10L, null);
    when(setRepository.findFuture(eq(Area.COASTAL), any(LocalDate.class)))
        .thenReturn(List.of(openEnded));

    assertThatThrownBy(() -> service.create(request("da.x", "1")))
        .hasMessageContaining("open-ended");
  }

  @DisplayName("Create Rejects Overlapping Interval")
  @Test
  void createRejectsOverlappingInterval() {
    when(setRepository.findFuture(eq(Area.COASTAL), any(LocalDate.class)))
        .thenReturn(List.of());
    when(validationService.validateForSave(any())).thenReturn(List.of());
    when(setRepository.findFutureOverlapping(eq(Area.COASTAL), any(LocalDate.class)))
        .thenReturn(List.of(futureSet(20L, null)));

    assertThatThrownBy(() -> service.create(request("da.x", "1")))
        .hasMessageContaining("overlaps");
  }

  @DisplayName("Create Closes Predecessor")
  @Test
  void createClosesPredecessor() {
    FormulaSetEntity predecessor = futureSet(30L, null);
    predecessor.setStartDate(LocalDate.now().plusDays(1));
    when(setRepository.findFuture(eq(Area.COASTAL), any(LocalDate.class)))
        .thenReturn(List.of());
    when(validationService.validateForSave(any())).thenReturn(List.of());
    when(setRepository.findFutureOverlapping(eq(Area.COASTAL), any(LocalDate.class)))
        .thenReturn(List.of());
    when(setRepository.findPredecessors(eq(Area.COASTAL), any(LocalDate.class)))
        .thenReturn(List.of(predecessor));
    when(setRepository.save(any(FormulaSetEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(rowRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    service.create(request("da.x", "1"));

    assertThat(predecessor.getEndDate()).isNotNull();
    verify(setRepository).save(predecessor);
  }

  @DisplayName("Create Happy Path")
  @Test
  void createHappyPath() {
    when(setRepository.findFuture(eq(Area.COASTAL), any(LocalDate.class)))
        .thenReturn(List.of());
    when(validationService.validateForSave(any())).thenReturn(List.of());
    when(setRepository.findFutureOverlapping(eq(Area.COASTAL), any(LocalDate.class)))
        .thenReturn(List.of());
    when(setRepository.findPredecessors(eq(Area.COASTAL), any(LocalDate.class)))
        .thenReturn(List.of());
    when(setRepository.save(any(FormulaSetEntity.class)))
        .thenAnswer(invocation -> {
          FormulaSetEntity e = invocation.getArgument(0);
          e.setId(100L);
          return e;
        });
    when(rowRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    var response = service.create(request("da.x", "1"));

    assertThat(response.id()).isEqualTo(100L);
    assertThat(response.formulas()).hasSize(1);
  }

  @DisplayName("Update Rejects Not Found")
  @Test
  void updateRejectsNotFound() {
    when(setRepository.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.update(999L, request("da.x", "1")))
        .hasMessageContaining("not found");
  }

  @DisplayName("Update Rejects Historical Set")
  @Test
  void updateRejectsHistoricalSet() {
    FormulaSetEntity historical = futureSet(1L, null);
    historical.setStartDate(LocalDate.now().minusDays(5));
    when(setRepository.findById(1L)).thenReturn(Optional.of(historical));

    assertThatThrownBy(() -> service.update(1L, request("da.x", "1")))
        .hasMessageContaining("read-only");
  }

  @DisplayName("Update Rejects Area Or Start Date Change")
  @Test
  void updateRejectsAreaOrStartDateChange() {
    FormulaSetEntity set = futureSet(1L, null);
    when(setRepository.findById(1L)).thenReturn(Optional.of(set));

    FormulaSetRequest differentArea = new FormulaSetRequest(Area.INTERIOR,
        set.getStartDate(),
        List.of(new FormulaItemDto("da.x", "1", 0)));

    assertThatThrownBy(() -> service.update(1L, differentArea))
        .hasMessageContaining("cannot be changed");
  }

  @DisplayName("Update Returns Early When Semantically Equal")
  @Test
  void updateReturnsEarlyWhenSemanticallyEqual() {
    FormulaSetEntity set = futureSet(1L, null);
    FormulaSetRowEntity existing = new FormulaSetRowEntity();
    existing.setFormulaKey("da.x");
    existing.setExpression("1");
    existing.setSortOrder(0);
    when(setRepository.findById(1L)).thenReturn(Optional.of(set));
    when(validationService.validateForSave(any())).thenReturn(List.of());
    when(rowRepository.findByFormulaSetIdOrderBySortOrderAscIdAsc(1L))
        .thenReturn(List.of(existing));

    var response = service.update(1L, request("da.x", "1"));

    assertThat(response.formulas()).hasSize(1);
    verify(rowRepository, never()).saveAll(any());
  }

  @DisplayName("Delete Rejects Not Found")
  @Test
  void deleteRejectsNotFound() {
    when(setRepository.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.delete(999L))
        .hasMessageContaining("not found");
  }

  @DisplayName("Delete Rejects Historical Set")
  @Test
  void deleteRejectsHistoricalSet() {
    FormulaSetEntity historical = futureSet(1L, null);
    historical.setStartDate(LocalDate.now().minusDays(5));
    when(setRepository.findById(1L)).thenReturn(Optional.of(historical));

    assertThatThrownBy(() -> service.delete(1L))
        .hasMessageContaining("open-ended");
  }

  @DisplayName("Delete Rejects Closed Set")
  @Test
  void deleteRejectsClosedSet() {
    FormulaSetEntity closed = futureSet(1L, LocalDate.of(2026, 12, 31));
    when(setRepository.findById(1L)).thenReturn(Optional.of(closed));

    assertThatThrownBy(() -> service.delete(1L))
        .hasMessageContaining("open-ended");
  }

  @DisplayName("Delete Rejects Already Deleted Set")
  @Test
  void deleteRejectsAlreadyDeletedSet() {
    FormulaSetEntity deleted = futureSet(1L, null);
    deleted.setDeleted(true);
    when(setRepository.findById(1L)).thenReturn(Optional.of(deleted));

    assertThatThrownBy(() -> service.delete(1L))
        .hasMessageContaining("not found");
  }

  @DisplayName("Update Rejects Deleted Set")
  @Test
  void updateRejectsDeletedSet() {
    FormulaSetEntity deleted = futureSet(1L, null);
    deleted.setDeleted(true);
    when(setRepository.findById(1L)).thenReturn(Optional.of(deleted));

    assertThatThrownBy(() -> service.update(1L, request("da.x", "1")))
        .hasMessageContaining("not found");
  }

  @DisplayName("Effective Rejects Not Found")
  @Test
  void effectiveRejectsNotFound() {
    when(setRepository.findEffective(Area.COASTAL, LocalDate.of(2026, 11, 3)))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.effective(LocalDate.of(2026, 11, 3), Area.COASTAL))
        .hasMessageContaining("No formula set");
  }

  @DisplayName("Validate Request Rejects Null Request")
  @Test
  void validateRequestRejectsNullRequest() {
    assertThatThrownBy(() -> service.create(null))
        .isInstanceOf(NullPointerException.class);
  }

  @DisplayName("Validate Request Rejects Duplicate Keys")
  @Test
  void validateRequestRejectsDuplicateKeys() {
    FormulaSetRequest duplicateKeys = new FormulaSetRequest(Area.COASTAL,
        LocalDate.now().plusDays(5),
        List.of(
            new FormulaItemDto("da.x", "1", 0),
            new FormulaItemDto("da.x", "2", 1)));

    assertThatThrownBy(() -> service.create(duplicateKeys))
        .hasMessageContaining("unique");
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

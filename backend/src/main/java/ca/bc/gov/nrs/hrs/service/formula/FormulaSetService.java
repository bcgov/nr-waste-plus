package ca.bc.gov.nrs.hrs.service.formula;

import ca.bc.gov.nrs.hrs.dto.formula.FormulaItemDto;
import ca.bc.gov.nrs.hrs.dto.formula.FormulaSetRequest;
import ca.bc.gov.nrs.hrs.dto.formula.FormulaSetResponse;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetRowEntity;
import ca.bc.gov.nrs.hrs.repository.FormulaSetRepository;
import ca.bc.gov.nrs.hrs.repository.FormulaSetRowRepository;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Owns the independent date-effective formula-set lifecycle. */
@Service
@RequiredArgsConstructor
public class FormulaSetService {
  private final FormulaSetRepository setRepository;
  private final FormulaSetRowRepository rowRepository;
  private final FormulaValidationService validationService;

  /** Creates a future set and closes the preceding open-ended set. */
  @Transactional
  public FormulaSetResponse create(FormulaSetRequest request) {
    validateRequest(request);
    LocalDate today = LocalDate.now();
    if (!request.startDate().isAfter(today)) {
      throw conflict("Formula sets can only be created in the future.");
    }
    List<FormulaSetEntity> future = setRepository.findFuture(request.area(), today);
    if (future.stream().anyMatch(set -> set.getEndDate() == null)) {
      throw conflict("Only one future open-ended formula set is allowed per area.");
    }
    validateExpressions(request);
    if (!setRepository.findFutureOverlapping(request.area(), request.startDate()).isEmpty()) {
      throw conflict("The formula-set interval overlaps an existing future set.");
    }
    FormulaSetEntity predecessor = setRepository.findPredecessors(request.area(), request.startDate())
        .stream().findFirst().orElse(null);
    if (predecessor != null) {
      predecessor.setEndDate(request.startDate().minusDays(1));
      setRepository.save(predecessor);
    }
    FormulaSetEntity set = new FormulaSetEntity();
    set.setArea(request.area());
    set.setStartDate(request.startDate());
    set = setRepository.save(set);
    return replaceRows(set, request);
  }

  /** Replaces a future set without changing its effective interval. */
  @Transactional
  public FormulaSetResponse update(Long id, FormulaSetRequest request) {
    validateRequest(request);
    FormulaSetEntity set = load(id);
    if (!set.getStartDate().isAfter(LocalDate.now())) {
      throw conflict("Effective and historical formula sets are read-only.");
    }
    if (!Objects.equals(set.getArea(), request.area())
        || !Objects.equals(set.getStartDate(), request.startDate())) {
      throw conflict("Formula-set area and startDate cannot be changed.");
    }
    validateExpressions(request);
    List<FormulaSetRowEntity> existing = rowRepository
        .findByFormulaSetIdOrderBySortOrderAscIdAsc(id);
    if (semanticallyEqual(existing, request.formulas())) {
      return response(set, existing);
    }
    replaceRowsInPlace(id, existing, request.formulas());
    return response(set,
        rowRepository.findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(id));
  }

  /** Soft-deletes the future open-ended set and reopens its predecessor. */
  @Transactional
  public void delete(Long id) {
    FormulaSetEntity set = load(id);
    if (!set.getStartDate().isAfter(LocalDate.now()) || set.getEndDate() != null) {
      throw conflict("Only a future open-ended formula set can be deleted.");
    }
    set.setDeleted(true);
    setRepository.save(set);
    setRepository.findPredecessors(set.getArea(), set.getStartDate()).stream().findFirst()
        .ifPresent(predecessor -> { predecessor.setEndDate(null); setRepository.save(predecessor); });
  }

  /** Reads the set effective for a submission date and selected area. */
  @Transactional(Transactional.TxType.SUPPORTS)
  public FormulaSetResponse effective(LocalDate date, Area area, String district) {
    FormulaSetEntity set = setRepository.findEffective(area, date)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "No formula set is effective for the requested date and area."));
    List<FormulaSetRowEntity> rows = rowRepository
        .findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(set.getId());
    return response(set, rows);
  }

  private FormulaSetResponse replaceRows(FormulaSetEntity set, FormulaSetRequest request) {
    List<FormulaSetRowEntity> rows = request.formulas().stream().map(item -> {
      FormulaSetRowEntity row = new FormulaSetRowEntity();
      row.setFormulaSetId(set.getId()); row.setFormulaKey(item.formulaKey());
      row.setExpression(item.expression()); row.setSortOrder(item.sortOrder());
      row.setDeclaredVariables(JsonNodeFactory.instance.objectNode());
      row.setValidationErrors(JsonNodeFactory.instance.arrayNode());
      return row;
    }).toList();
    return response(set, rowRepository.saveAll(rows));
  }

  private void replaceRowsInPlace(Long formulaSetId, List<FormulaSetRowEntity> existing,
      List<FormulaItemDto> requested) {
    Map<String, FormulaSetRowEntity> byKey = new java.util.LinkedHashMap<>();
    existing.forEach(row -> byKey.put(row.getFormulaKey(), row));
    List<FormulaSetRowEntity> changed = new java.util.ArrayList<>();
    for (FormulaItemDto item : requested) {
      FormulaSetRowEntity row = byKey.remove(item.formulaKey());
      if (row == null) {
        row = new FormulaSetRowEntity();
        row.setFormulaSetId(formulaSetId);
        row.setFormulaKey(item.formulaKey());
      }
      row.setExpression(item.expression());
      row.setSortOrder(item.sortOrder());
      row.setDeleted(false);
      row.setDeclaredVariables(JsonNodeFactory.instance.objectNode());
      row.setValidationErrors(JsonNodeFactory.instance.arrayNode());
      changed.add(row);
    }
    byKey.values().forEach(row -> row.setDeleted(true));
    rowRepository.saveAll(changed);
    rowRepository.saveAll(byKey.values());
  }

  private void validateExpressions(FormulaSetRequest request) {
    List<FormulaDefinition> definitions = request.formulas().stream()
        .map(item -> new FormulaDefinition(item.formulaKey(), item.expression())).toList();
    HashMap<String, BigDecimal> knownVariables = new HashMap<>();
    request.formulas().forEach(item -> FormulaVariableExtractor
        .extract(item.expression(), FormulaParseMode.MATHEMATICAL)
        .forEach(variable -> knownVariables.put(variable, BigDecimal.ONE)));
    List<FormulaValidationError> errors = validationService.validateForSave(
        new FormulaValidationRequest(definitions, knownVariables, FormulaParseMode.MATHEMATICAL));
    if (!errors.isEmpty()) throw conflict(errors.toString());
  }

  private void validateRequest(FormulaSetRequest request) {
    Objects.requireNonNull(request, "request");
    if (request.formulas().stream().map(FormulaItemDto::formulaKey).distinct().count()
        != request.formulas().size()) throw conflict("Formula keys must be unique.");
  }
  private FormulaSetEntity load(Long id) { return setRepository.findById(id).orElseThrow(
      () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Formula set not found: " + id)); }
  private boolean semanticallyEqual(List<FormulaSetRowEntity> rows, List<FormulaItemDto> items) {
    return rows.size() == items.size() && rows.stream().allMatch(row -> items.stream().anyMatch(item ->
        row.getFormulaKey().equals(item.formulaKey()) && row.getExpression().equals(item.expression())
            && row.getSortOrder() == item.sortOrder()));
  }
  private FormulaSetResponse response(FormulaSetEntity set, List<FormulaSetRowEntity> rows) {
    return new FormulaSetResponse(set.getId(), set.getArea(), set.getStartDate(), set.getEndDate(),
        set.isDeleted(), rows.stream().map(row -> new FormulaItemDto(row.getFormulaKey(),
            row.getExpression(), row.getSortOrder())).toList());
  }
  private ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, message);
  }
}

package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetRowEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** Formula rows in stable display order. */
public interface FormulaSetRowRepository extends JpaRepository<FormulaSetRowEntity, Long> {
  List<FormulaSetRowEntity> findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(
      Long formulaSetId);

  /** Finds all rows, including soft-deleted historical rows, in stable order. */
  List<FormulaSetRowEntity> findByFormulaSetIdOrderBySortOrderAscIdAsc(Long formulaSetId);
}

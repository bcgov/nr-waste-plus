package ca.bc.gov.nrs.hrs.repository.codes;

import ca.bc.gov.nrs.hrs.entity.codes.AssessAreaStatusEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface AssessAreaStatusRepository extends JpaRepository<AssessAreaStatusEntity, String> {

  @Query(
      nativeQuery = true,
      value = """
          SELECT *
          FROM THE.WASTE_ASSESS_AREA_STS_CODE
          WHERE
          (EXPIRY_DATE IS NULL OR EXPIRY_DATE > SYSDATE)
          AND EFFECTIVE_DATE <= SYSDATE
          ORDER BY WASTE_ASSESS_AREA_STS_CODE""")
  List<AssessAreaStatusEntity> findAllValid();

}

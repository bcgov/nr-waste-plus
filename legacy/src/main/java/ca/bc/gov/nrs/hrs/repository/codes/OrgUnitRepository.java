package ca.bc.gov.nrs.hrs.repository.codes;

import ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for organization unit data access operations.
 *
 * <p>Provides methods to retrieve organization units used by the application. This repository
 * extends {@link JpaRepository} for standard CRUD operations and defines custom finder methods
 * used by service and mapper layers.</p>
 */
@Repository
public interface OrgUnitRepository extends JpaRepository<OrgUnitEntity, Long> {

  /**
   * Find organization units by a list of codes and return them ordered by code ascending.
   *
   * @param orgUnitCodes the list of organization unit codes to search for
   * @return a list of matching {@link OrgUnitEntity} ordered by orgUnitCode ascending
   */
  List<OrgUnitEntity> findAllByOrgUnitCodeInOrderByOrgUnitCodeAsc(List<String> orgUnitCodes);
}

package ca.bc.gov.nrs.hrs.repository.codes;

import ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity;
import java.util.List;
import java.util.Optional;
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

  /**
   * Find a single organization unit by its code.
   *
   * <p>Returns the {@link OrgUnitEntity} wrapped in an {@link Optional} that has the supplied
   * {@code orgUnitCode}. The {@link Optional} will be empty if no matching record exists.</p>
   *
   * @param districtCode the organization unit code to look up (e.g. "DKM")
   * @return an {@link Optional} containing the matching {@link OrgUnitEntity}, or empty if none
   *     found
   */
  Optional<OrgUnitEntity> findByOrgUnitCode(String districtCode);

}

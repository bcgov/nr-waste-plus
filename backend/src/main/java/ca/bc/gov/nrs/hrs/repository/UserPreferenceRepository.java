package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.users.UserPreferenceEntity;
import java.util.Optional;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

/**
 * Repository for accessing user preference entities.
 *
 * <p>
 * Extends {@link PagingAndSortingRepository} and {@link CrudRepository} to
 * provide basic CRUD operations and paging/sorting capabilities for
 * {@link UserPreferenceEntity} instances. The repository uses the user's id
 * (String) as the primary key type.
 * </p>
 */
@Repository
public interface UserPreferenceRepository extends
    PagingAndSortingRepository<UserPreferenceEntity, String>,
    CrudRepository<UserPreferenceEntity, String> {

  /**
   * Find a {@link UserPreferenceEntity} by its user id.
   *
   * @param userId the id of the user
   * @return an {@link Optional} containing the entity if found
   */
  @Override
  @NonNull
  Optional<UserPreferenceEntity> findById(@NonNull String userId);

}

package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.users.UserIdentityEntity;
import java.util.Optional;
import org.jspecify.annotations.NonNull;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for accessing {@link UserIdentityEntity} records.
 *
 * <p>Provides CRUD operations for persisted Cognito user identity data.
 * The primary key is the user's Cognito {@code sub} (subject) identifier.
 * </p>
 */
@Repository
public interface UserIdentityRepository extends CrudRepository<UserIdentityEntity, String> {

  /**
   * Find a {@link UserIdentityEntity} by its Cognito subject identifier.
   *
   * @param sub the Cognito subject identifier
   * @return an {@link Optional} containing the entity if found
   */
  @Override
  @NonNull
  Optional<UserIdentityEntity> findById(@NonNull String sub);

}


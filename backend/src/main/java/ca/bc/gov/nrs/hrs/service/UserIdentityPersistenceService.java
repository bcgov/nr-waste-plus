package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.entity.users.UserIdentityEntity;
import ca.bc.gov.nrs.hrs.repository.UserIdentityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persistence boundary for user identity writes.
 *
 * <p>Keeps database transactions scoped only to repository save operations so
 * upstream network calls can run outside any open transaction.
 * </p>
 */
@Service
@RequiredArgsConstructor
public class UserIdentityPersistenceService {

  private final UserIdentityRepository repository;

  /**
   * Persist hydrated identity in a short transaction.
   *
   * @param hydratedIdentity identity populated from Cognito userInfo
   * @return persisted entity
   */
  @Transactional
  public UserIdentityEntity saveHydratedIdentity(UserIdentityEntity hydratedIdentity) {
    return repository.save(hydratedIdentity);
  }
}


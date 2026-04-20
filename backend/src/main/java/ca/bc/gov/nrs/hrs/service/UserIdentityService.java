package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.entity.users.UserIdentityEntity;
import ca.bc.gov.nrs.hrs.provider.cognito.CognitoUserInfoClient;
import ca.bc.gov.nrs.hrs.provider.cognito.CognitoUserInfoResponse;
import ca.bc.gov.nrs.hrs.repository.UserIdentityRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service responsible for hydrating user identity data from Cognito's
 * {@code /oauth2/userInfo} endpoint and optionally persisting it.
 *
 * <p>Hydration always calls Cognito on each request so identity attributes are
 * current at request time. Database persistence is controlled by
 * {@link FeatureFlag#USER_IDENTITY_PERSISTENCE_ENABLED} to support privacy-first
 * rollout: when disabled, no user identity data is written to or read from the
 * local database.</p>
 */
@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class UserIdentityService {

  private final UserIdentityRepository repository;
  private final CognitoUserInfoClient cognitoClient;
  private final FeatureFlagsConfiguration featureFlagsConfiguration;

  /**
   * Hydrate identity from Cognito for the given user on every call.
   *
   * <p>If {@link FeatureFlag#USER_IDENTITY_PERSISTENCE_ENABLED} is enabled,
   * the hydrated entity is also saved and the persisted instance is returned.
   * When disabled, the hydrated entity is returned without persistence.</p>
   *
   * @param sub the Cognito subject identifier from the access token
   * @param accessToken the raw access token forwarded to Cognito userInfo
   * @return hydrated identity if Cognito call succeeds; otherwise empty
   */
  @NewSpan
  @Transactional
  public Optional<UserIdentityEntity> getOrRefreshBySub(String sub, String accessToken) {
    return cognitoClient.fetchUserInfo(accessToken)
        .map(info -> maybePersist(toEntity(sub, info)));
  }

  /**
   * Retrieve a previously persisted identity for async workflows.
   *
   * <p>When persistence is disabled via
   * {@link FeatureFlag#USER_IDENTITY_PERSISTENCE_ENABLED}, this method returns
   * {@link Optional#empty()} by design.</p>
   *
   * @param sub the Cognito subject identifier
   * @return optional persisted entity if persistence is enabled and record exists
   */
  @NewSpan
  public Optional<UserIdentityEntity> findPersistedBySub(String sub) {
    if (isPersistenceEnabled()) {
      return repository.findById(sub);
    }
    return Optional.empty();
  }

  private UserIdentityEntity maybePersist(UserIdentityEntity hydratedIdentity) {
    if (isPersistenceEnabled()) {
      log.debug("Persisting hydrated identity for sub={}", hydratedIdentity.getSub());
      return repository.save(hydratedIdentity);
    }
    return hydratedIdentity;
  }

  private boolean isPersistenceEnabled() {
    return featureFlagsConfiguration.isEnabled(FeatureFlag.USER_IDENTITY_PERSISTENCE_ENABLED);
  }

  private UserIdentityEntity toEntity(String fallbackSub, CognitoUserInfoResponse info) {
    String resolvedSub = info.sub() == null || info.sub().isBlank() ? fallbackSub : info.sub();

    return UserIdentityEntity.builder()
        .sub(resolvedSub)
        .email(info.email())
        .name(info.name())
        .givenName(info.givenName())
        .familyName(info.familyName())
        .idpName(info.idpName())
        .idpUserId(info.idpUserId())
        .idpUsername(info.idpUsername())
        .idpDisplayName(info.idpDisplayName())
        .businessId(info.businessId())
        .rawAttributes(info.rawAttributes())
        .lastSyncedAt(Instant.now())
        .build();
  }
}

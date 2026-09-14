package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.configuration.HrsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.entity.users.UserIdentityEntity;
import ca.bc.gov.nrs.hrs.provider.cognito.CognitoUserInfoClient;
import ca.bc.gov.nrs.hrs.provider.cognito.CognitoUserInfoResponse;
import ca.bc.gov.nrs.hrs.repository.UserIdentityRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service responsible for hydrating user identity data from Cognito's {@code /oauth2/userInfo}
 * endpoint and optionally persisting it.
 *
 * <p>When persistence is enabled, previously synced identities are cached
 * in the database and only refreshed after the configured TTL expires.
 * Database persistence is controlled by
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
  private final UserIdentityPersistenceService userIdentityPersistenceService;
  private final CognitoUserInfoClient cognitoClient;
  private final FeatureFlagsConfiguration featureFlagsConfiguration;
  private final HrsConfiguration configuration;

  /**
   * Hydrate identity from Cognito for the given user, returning a cached
   * persisted entity when it is still within the configured TTL.
   *
   * <p>When persistence is enabled and an existing entity is found whose
   * {@code lastSyncedAt} is within {@link HrsConfiguration.CognitoConfiguration#getIdentityTtl()},
   * the cached entity is returned without calling Cognito. Otherwise the
   * entity is refreshed from Cognito and persisted.</p>
   *
   * @param sub the Cognito subject identifier from the access token
   * @param accessToken the raw access token forwarded to Cognito userInfo
   * @return hydrated identity if Cognito call succeeds; otherwise empty
   */
  @NewSpan
  public Optional<UserIdentityEntity> getOrRefreshBySub(String sub, String accessToken) {
    if (isPersistenceEnabled()) {
      Duration ttl = configuration.getCognito().getIdentityTtl();
      Optional<UserIdentityEntity> existing = findPersistedBySub(sub);
      if (existing.isPresent()
          && existing.get().getLastSyncedAt() != null
          && Instant.now().isBefore(existing.get().getLastSyncedAt().plus(ttl))) {
        log.debug(
            "Returning cached identity for sub={} (lastSyncedAt={}, ttl={})",
            sub, existing.get().getLastSyncedAt(), ttl);
        return existing;
      }
    }
    return cognitoClient.fetchUserInfo(accessToken)
        .map(info -> maybePersist(toEntity(sub, info)));
  }

  /**
   * Retrieve a previously persisted identity for async workflows.
   *
   * <p>When persistence is disabled via {@link FeatureFlag#USER_IDENTITY_PERSISTENCE_ENABLED}, this
   * method returns {@link Optional#empty()} by design.
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
      return userIdentityPersistenceService.saveHydratedIdentity(hydratedIdentity);
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

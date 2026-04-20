package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.entity.users.UserIdentityEntity;
import ca.bc.gov.nrs.hrs.provider.cognito.CognitoUserInfoClient;
import ca.bc.gov.nrs.hrs.provider.cognito.CognitoUserInfoResponse;
import ca.bc.gov.nrs.hrs.repository.UserIdentityRepository;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@DisplayName("Unit Test | UserIdentityService")
@ExtendWith(MockitoExtension.class)
class UserIdentityServiceTest {

  @Mock
  private UserIdentityRepository repository;

  @Mock
  private CognitoUserInfoClient cognitoClient;

  @Mock
  private FeatureFlagsConfiguration featureFlagsConfiguration;

  @InjectMocks
  private UserIdentityService service;

  @Test
  @DisplayName("should always call userInfo and skip persistence when flag is disabled")
  void shouldHydrateWithoutPersistenceWhenFlagDisabled() {
    when(featureFlagsConfiguration.isEnabled(FeatureFlag.USER_IDENTITY_PERSISTENCE_ENABLED))
        .thenReturn(false);
    when(cognitoClient.fetchUserInfo("token"))
        .thenReturn(Optional.of(sampleResponse("sub-from-user-info")));

    Optional<UserIdentityEntity> result = service.getOrRefreshBySub("sub-from-jwt", "token");

    assertThat(result).isPresent();
    assertThat(result.orElseThrow().getSub()).isEqualTo("sub-from-user-info");
    verify(cognitoClient).fetchUserInfo("token");
    verify(repository, never()).save(org.mockito.ArgumentMatchers.any(UserIdentityEntity.class));
    verify(repository, never()).findById(org.mockito.ArgumentMatchers.anyString());
  }

  @Test
  @DisplayName("should persist hydrated identity when flag is enabled")
  void shouldPersistWhenFlagEnabled() {
    when(featureFlagsConfiguration.isEnabled(FeatureFlag.USER_IDENTITY_PERSISTENCE_ENABLED))
        .thenReturn(true);
    when(cognitoClient.fetchUserInfo("token"))
        .thenReturn(Optional.of(sampleResponse("sub-from-user-info")));
    when(repository.save(org.mockito.ArgumentMatchers.any(UserIdentityEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    Optional<UserIdentityEntity> result = service.getOrRefreshBySub("sub-from-jwt", "token");

    assertThat(result).isPresent();
    verify(cognitoClient).fetchUserInfo("token");
    verify(repository).save(org.mockito.ArgumentMatchers.any(UserIdentityEntity.class));
    verify(repository, never()).findById(org.mockito.ArgumentMatchers.anyString());
  }

  @Test
  @DisplayName("should return empty persisted identity when persistence flag is disabled")
  void shouldReturnEmptyPersistedIdentityWhenFlagDisabled() {
    when(featureFlagsConfiguration.isEnabled(FeatureFlag.USER_IDENTITY_PERSISTENCE_ENABLED))
        .thenReturn(false);

    Optional<UserIdentityEntity> result = service.findPersistedBySub("sub");

    assertThat(result).isEmpty();
    verify(repository, never()).findById(org.mockito.ArgumentMatchers.anyString());
  }

  @Test
  @DisplayName("should delegate persisted identity lookup when persistence flag is enabled")
  void shouldReadPersistedIdentityWhenFlagEnabled() {
    UserIdentityEntity persisted = UserIdentityEntity.builder().sub("sub").build();
    when(featureFlagsConfiguration.isEnabled(FeatureFlag.USER_IDENTITY_PERSISTENCE_ENABLED))
        .thenReturn(true);
    when(repository.findById("sub")).thenReturn(Optional.of(persisted));

    Optional<UserIdentityEntity> result = service.findPersistedBySub("sub");

    assertThat(result).contains(persisted);
    verify(repository).findById("sub");
  }

  private CognitoUserInfoResponse sampleResponse(String sub) {
    return new CognitoUserInfoResponse(
        sub,
        "user@example.com",
        "John Doe",
        null,
        null,
        "idir",
        "idp-user-id",
        "idp-user",
        "Doe, John",
        null,
        java.util.List.of(),
        Map.of("sub", sub)
    );
  }
}


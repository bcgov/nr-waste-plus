package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.entity.users.UserPreferenceEntity;
import ca.bc.gov.nrs.hrs.repository.UserPreferenceRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service responsible for reading and persisting user preference data.
 *
 * <p>Provides methods to retrieve a user's preferences as a {@link Map} and to
 * save updated preferences. Preferences are stored in the {@link
 * UserPreferenceEntity} and accessed via {@link UserPreferenceRepository}.
 * </p>
 */
@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class UserService {

  private final UserPreferenceRepository preferenceRepository;

  /**
   * Retrieve preferences for a given user id.
   *
   * <p>Returns an empty map when no preferences have been stored for the user.</p>
   *
   * @param userId the id of the user to fetch preferences for
   * @return a map of preference keys to values (never null)
   */
  @NewSpan
  public Map<String, Object> getUserPreferences(String userId) {

    log.info("Retrieving preferences for user: {}", userId);
    return preferenceRepository
        .findById(userId)
        .map(UserPreferenceEntity::getPreferences)
        .orElse(Map.of());
  }

  /**
   * Persist or update preferences for a given user.
   *
   * <p>If a preferences record already exists for the user it will be updated
   * with the provided values; otherwise a new {@link UserPreferenceEntity}
   * will be created and saved.
   * </p>
   *
   * @param userId the id of the user
   * @param preferences the preferences to save
   */
  @NewSpan
  public void saveUserPreferences(String userId, Map<String, Object> preferences) {


    log.info("Saving preferences for user: {}", userId);

    UserPreferenceEntity preferenceEntity =
        preferenceRepository
            .findById(userId)
            .map(preference -> preference.withPreferences(preferences))
            .orElse(
                UserPreferenceEntity
                    .builder()
                    .userId(userId)
                    .preferences(preferences)
                    .build()
            );

    preferenceRepository.save(preferenceEntity);
  }
}

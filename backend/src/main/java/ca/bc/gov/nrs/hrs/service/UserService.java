package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.entity.users.UserBookmarkEntity;
import ca.bc.gov.nrs.hrs.entity.users.UserBookmarkEntityId;
import ca.bc.gov.nrs.hrs.entity.users.UserPreferenceEntity;
import ca.bc.gov.nrs.hrs.repository.UserBookmarkRepository;
import ca.bc.gov.nrs.hrs.repository.UserPreferenceRepository;
import io.github.resilience4j.retry.annotation.Retry;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

/**
 * Service responsible for reading and persisting user preference data.
 *
 * <p>Provides methods to retrieve a user's preferences as a {@link Map} and to
 * save updated preferences. Preferences are stored in the {@link UserPreferenceEntity} and accessed
 * via {@link UserPreferenceRepository}.
 * </p>
 */
@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class UserService {

  private final UserPreferenceRepository preferenceRepository;
  private final UserBookmarkRepository bookmarkRepository;

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
   * with the provided values; otherwise a new {@link UserPreferenceEntity} will be created and
   * saved.
   * </p>
   *
   * @param userId      the id of the user
   * @param preferences the preferences to save
   */
  @NewSpan
  @Retry(name = "saveUserPreferences")
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

  /**
   * Adds a bookmark for the given user and reporting unit.
   *
   * <p>This method is idempotent: calling it multiple times with the same arguments
   * has the same effect as calling it once. If the bookmark already exists, the
   * {@code save} call becomes a no-op merge (no extra columns to update), so no
   * separate existence check is needed and no race condition can occur.</p>
   *
   * @param userId          the user's identifier
   * @param reportingUnitId the reporting unit to bookmark
   */
  @NewSpan
  @Transactional
  public void addUserBookmark(String userId, Long reportingUnitId) {
    log.info("Adding bookmark for user: {} and reporting unit: {}", userId, reportingUnitId);
    bookmarkRepository.save(new UserBookmarkEntity(userId, reportingUnitId));
  }

  /**
   * Removes a bookmark for the given user and reporting unit.
   *
   * <p>This method is idempotent: calling it when the bookmark does not exist is a
   * safe no-op. The existence check and the delete are wrapped in a single
   * transaction to prevent a race condition between the two operations.</p>
   *
   * @param userId          the user's identifier
   * @param reportingUnitId the reporting unit to un-bookmark
   */
  @NewSpan
  @Transactional
  public void deleteUserBookmark(String userId, Long reportingUnitId) {
    log.info("Deleting bookmark for user: {} and reporting unit: {}", userId, reportingUnitId);
    Optional
        .of(new UserBookmarkEntityId(userId, reportingUnitId))
        .filter(bookmarkRepository::existsById)
        .ifPresent(bookmarkRepository::deleteById);
  }

  @NewSpan
  public List<Long> getUserBookmarksInList(String userId, List<Long> reportingUnitIds) {
    List<UserBookmarkEntity> bookmarkEntities =
      (CollectionUtils.isEmpty(reportingUnitIds))
          ? bookmarkRepository.findByUserId(userId)
          : bookmarkRepository.findByUserIdAndReportingUnitIdIn(userId, reportingUnitIds);

    return bookmarkEntities
        .stream()
        .map(UserBookmarkEntity::getReportingUnitId)
        .toList();
  }
}

package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.entity.users.UserPreferenceEntity;
import ca.bc.gov.nrs.hrs.repository.UserPreferenceRepository;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

  private final UserPreferenceRepository preferenceRepository;

  public Map<String, Object> getUserPreferences(String userId) {

    log.info("Retrieving preferences for user: {}", userId);
    return preferenceRepository
        .findById(userId)
        .map(UserPreferenceEntity::getPreferences)
        .orElse(Map.of());
  }

  public void saveUserPreferences(String userId, Map<String, Object> preferences) {
    preferenceRepository.save(new UserPreferenceEntity(userId, preferences));
  }
}

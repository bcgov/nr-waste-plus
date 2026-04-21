package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.service.UserService;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints for user-specific operations such as reading and updating user preferences.
 *
 * <p>This controller exposes simple operations to get and persist a user's preferences. The
 * authenticated user's id is resolved from the provided JWT using
 * {@link JwtPrincipalUtil#getUserId(org.springframework.security.oauth2.jwt.Jwt)}.
 * </p>
 */
@RestController
@RequestMapping("/api/users")
@AllArgsConstructor
@Observed
@Slf4j
public class UserController {

  private final UserService userService;

  /**
   * Retrieve the preferences for the authenticated user.
   *
   * <p>The user's id is extracted from the provided JWT and used to fetch the preferences map from
   * {@link UserService#getUserPreferences(String)}.
   * </p>
   *
   * @param jwt the authenticated user's JWT principal (injected by Spring)
   * @return a map of preference keys to values for the authenticated user
   */
  @GetMapping("/preferences")
  public Map<String, Object> getPreferences(@AuthenticationPrincipal Jwt jwt) {
    log.info("Retrieving preferences for user: {}", JwtPrincipalUtil.getUserId(jwt));
    return userService.getUserPreferences(JwtPrincipalUtil.getUserId(jwt));
  }

  /**
   * Update (replace) the preferences for the authenticated user.
   *
   * <p>The preferences provided in the request body are saved for the user identified by the JWT.
   * The method delegates to {@link UserService#saveUserPreferences(String, java.util.Map)}.
   * </p>
   *
   * @param jwt         the authenticated user's JWT principal (injected by Spring)
   * @param preferences a map containing the preference keys and values to save
   */
  @PutMapping("/preferences")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public void updatePreferences(
      @AuthenticationPrincipal Jwt jwt,
      @RequestBody Map<String, Object> preferences
  ) {
    log.info("Updating preferences for user: {}", JwtPrincipalUtil.getUserId(jwt));
    userService.saveUserPreferences(
        JwtPrincipalUtil.getUserId(jwt),
        preferences
    );
  }

  /**
   * Bookmark a reporting unit for the authenticated user.
   *
   * <p>Delegates to {@link UserService#addUserBookmark(String, Long)}. The operation is
   * idempotent: bookmarking an already-bookmarked reporting unit is a safe no-op.</p>
   *
   * @param jwt             the authenticated user's JWT principal (injected by Spring)
   * @param reportingUnitId the reporting unit to bookmark
   */
  @PutMapping("/bookmarks/{reportingUnitId}")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public void addBookmarkedReportingUnit(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long reportingUnitId
  ) {
    log.info("Adding bookmark for user: {} and reporting unit: {}",
        JwtPrincipalUtil.getUserId(jwt), reportingUnitId);
    userService.addUserBookmark(JwtPrincipalUtil.getUserId(jwt), reportingUnitId);
  }

  /**
   * Remove a bookmarked reporting unit for the authenticated user.
   *
   * <p>Delegates to {@link UserService#deleteUserBookmark(String, Long)}. The operation is
   * idempotent: removing a bookmark that does not exist is a safe no-op.</p>
   *
   * @param jwt             the authenticated user's JWT principal (injected by Spring)
   * @param reportingUnitId the reporting unit to un-bookmark
   */
  @DeleteMapping("/bookmarks/{reportingUnitId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removeBookmarkedReportingUnit(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long reportingUnitId
  ) {
    log.info("Removing bookmark for user: {} and reporting unit: {}",
        JwtPrincipalUtil.getUserId(jwt), reportingUnitId);
    userService.deleteUserBookmark(JwtPrincipalUtil.getUserId(jwt), reportingUnitId);
  }

  /**
   * Retrieve all bookmarked reporting unit IDs for the authenticated user.
   *
   * <p>Delegates to {@link UserService#getUserBookmarks(String)} and returns the list of
   * reporting unit IDs the user has bookmarked.</p>
   *
   * @param jwt the authenticated user's JWT principal (injected by Spring)
   * @return list of bookmarked reporting unit IDs
   */
  @GetMapping("/bookmarks")
  public List<Long> getBookmarkedReportingUnitIds(@AuthenticationPrincipal Jwt jwt) {
    log.info("Retrieving bookmarks for user: {}", JwtPrincipalUtil.getUserId(jwt));
    return userService.getUserBookmarks(JwtPrincipalUtil.getUserId(jwt));
  }
}

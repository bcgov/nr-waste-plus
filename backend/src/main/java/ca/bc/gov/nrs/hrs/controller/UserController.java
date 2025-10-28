package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.service.UserService;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints for user-specific operations such as reading and updating
 * user preferences.
 * <p>
 * This controller exposes simple operations to get and persist a user's
 * preferences. The authenticated user's id is resolved from the provided JWT
 * using {@link JwtPrincipalUtil#getUserId(org.springframework.security.oauth2.jwt.Jwt)}.
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
   * <p>
   * The user's id is extracted from the provided JWT and used to fetch the
   * preferences map from {@link UserService#getUserPreferences(String)}.
   * </p>
   *
   * @param jwt the authenticated user's JWT principal (injected by Spring)
   * @return a map of preference keys to values for the authenticated user
   */
  @GetMapping("/preferences")
  public Map<String, Object> getPreferences(@AuthenticationPrincipal Jwt jwt){
    return userService.getUserPreferences(JwtPrincipalUtil.getUserId(jwt));
  }

  /**
   * Update (replace) the preferences for the authenticated user.
   *
   * <p>
   * The preferences provided in the request body are saved for the user
   * identified by the JWT. The method delegates to
   * {@link UserService#saveUserPreferences(String, java.util.Map)}.
   * </p>
   *
   * @param jwt the authenticated user's JWT principal (injected by Spring)
   * @param preferences a map containing the preference keys and values to save
   */
  @PutMapping("/preferences")
  public void updatePreferences(
      @AuthenticationPrincipal Jwt jwt,
      @RequestBody Map<String, Object> preferences
  ){
    userService.saveUserPreferences(
        JwtPrincipalUtil.getUserId(jwt),
        preferences
    );
  }

}

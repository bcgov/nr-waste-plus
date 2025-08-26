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

@RestController
@RequestMapping("/api/users")
@AllArgsConstructor
@Observed
@Slf4j
public class UserController {

  private final UserService userService;

  @GetMapping("/preferences")
  public Map<String, Object> getPreferences(@AuthenticationPrincipal Jwt jwt){
    return userService.getUserPreferences(JwtPrincipalUtil.getUserId(jwt));
  }

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

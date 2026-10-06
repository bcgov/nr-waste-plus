package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class JwtRoleCheckerTest {

  private final JwtRoleChecker checker = new JwtRoleChecker();

  @AfterEach
  void clearContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void roleMatchingIsCaseInsensitiveAndUsesRoleBoundary() {
    authenticate("WASTE_PLUS_VIEWER_12345", "WASTE_PLUS_ADMIN");

    assertThat(checker.hasRole("waste_plus_viewer")).isTrue();
    assertThat(checker.hasRole("WASTE_PLUS_VIEWER_12345")).isTrue();
    assertThat(checker.hasRole("WASTE_PLUS_VIEWERISH")).isFalse();
    assertThat(checker.hasRole("")).isFalse();
  }

  @Test
  void concreteRoleDoesNotMatchScopedOrNearPrefixAuthority() {
    authenticate("WASTE_PLUS_VIEWER_12345", "WASTE_PLUS_ADMINISH");

    assertThat(checker.hasConcreteRole("WASTE_PLUS_VIEWER")).isFalse();
    assertThat(checker.hasConcreteRole("WASTE_PLUS_ADMINISH")).isTrue();
  }

  @Test
  void unauthenticatedContextDoesNotGrantRole() {
    SecurityContextHolder.clearContext();

    assertThat(checker.hasRoleMatching(role -> true)).isFalse();
  }

  private void authenticate(String... authorities) {
    TestingAuthenticationToken authentication =
        new TestingAuthenticationToken(
            "synthetic-user",
            "synthetic-credentials",
            List.of(authorities).stream().map(SimpleGrantedAuthority::new).toList());
    SecurityContextHolder.getContext().setAuthentication(authentication);
  }
}

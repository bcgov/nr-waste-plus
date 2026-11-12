package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.WithMockJwtSecurityContextFactory;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

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

  @Nested
  @DisplayName("isValidRouteGatePrincipal")
  class RouteGatePrincipalValidation {

    @Test
    @DisplayName("null or unauthenticated principal is invalid")
    void unauthenticatedOrNullIsInvalid() {
      assertThat(checker.isValidRouteGatePrincipal(null)).isFalse();

      TestingAuthenticationToken unauth = new TestingAuthenticationToken("user", "cred");
      unauth.setAuthenticated(false);
      assertThat(checker.isValidRouteGatePrincipal(unauth)).isFalse();
    }

    @Test
    @DisplayName("BCeID SUBMITTER or VIEWER is valid")
    void bceidSubmitterOrViewerIsValid() {
      Jwt jwtSub =
          WithMockJwtSecurityContextFactory.createJwt(
              "bceid_sub",
              List.of("WASTE_PLUS_SUBMITTER_00012345"),
              "bceidbusiness",
              "Sub, User",
              "sub@bceid.ca");
      JwtAuthenticationToken authSub =
          new JwtAuthenticationToken(
              jwtSub, AuthorityUtils.createAuthorityList("WASTE_PLUS_SUBMITTER_00012345"));
      assertThat(checker.isValidRouteGatePrincipal(authSub)).isTrue();

      Jwt jwtViewer =
          WithMockJwtSecurityContextFactory.createJwt(
              "bceid_viewer",
              List.of("WASTE_PLUS_VIEWER_00012345"),
              "bceidbusiness",
              "View, User",
              "view@bceid.ca");
      JwtAuthenticationToken authViewer =
          new JwtAuthenticationToken(
              jwtViewer, AuthorityUtils.createAuthorityList("WASTE_PLUS_VIEWER_00012345"));
      assertThat(checker.isValidRouteGatePrincipal(authViewer)).isTrue();
    }

    @Test
    @DisplayName("BCeID claiming ADMIN, AREA, or DISTRICT is rejected (403 rule)")
    void bceidClaimingForbiddenRolesIsRejected() {
      for (String forbiddenGroup :
          List.of("WASTE_PLUS_ADMIN", "WASTE_PLUS_AREA", "WASTE_PLUS_DISTRICT_DKM")) {
        Jwt jwt =
            WithMockJwtSecurityContextFactory.createJwt(
                "bceid_bad",
                List.of(forbiddenGroup, "WASTE_PLUS_SUBMITTER_00012345"),
                "bceidbusiness",
                "Bad, User",
                "bad@bceid.ca");
        JwtAuthenticationToken auth =
            new JwtAuthenticationToken(
                jwt, AuthorityUtils.createAuthorityList(forbiddenGroup, "WASTE_PLUS_SUBMITTER_00012345"));
        assertThat(checker.isValidRouteGatePrincipal(auth))
            .as("BCeID claiming " + forbiddenGroup + " must be rejected")
            .isFalse();
      }
    }

    @Test
    @DisplayName("IDIR carrying a single role is valid")
    void idirSingleRoleIsValid() {
      for (String group :
          List.of(
              "WASTE_PLUS_ADMIN",
              "WASTE_PLUS_AREA",
              "WASTE_PLUS_DISTRICT_DKM",
              "WASTE_PLUS_VIEWER")) {
        Jwt jwt =
            WithMockJwtSecurityContextFactory.createJwt(
                "idir_user", List.of(group), "idir", "Idir, User", "idir@gov.bc.ca");
        JwtAuthenticationToken auth =
            new JwtAuthenticationToken(jwt, AuthorityUtils.createAuthorityList(group));
        assertThat(checker.isValidRouteGatePrincipal(auth))
            .as("IDIR with single role " + group + " must be valid")
            .isTrue();
      }
    }

    @Test
    @DisplayName("IDIR carrying multiple roles is rejected (403 rule)")
    void idirMultipleRolesIsRejected() {
      List<List<String>> multiRoleCombinations =
          List.of(
              List.of("WASTE_PLUS_ADMIN", "WASTE_PLUS_AREA"),
              List.of("WASTE_PLUS_ADMIN", "WASTE_PLUS_DISTRICT_DKM"),
              List.of("WASTE_PLUS_DISTRICT_DKM", "WASTE_PLUS_VIEWER"),
              List.of("WASTE_PLUS_AREA", "WASTE_PLUS_VIEWER"));

      for (List<String> groups : multiRoleCombinations) {
        Jwt jwt =
            WithMockJwtSecurityContextFactory.createJwt(
                "idir_multi", groups, "idir", "Multi, User", "multi@gov.bc.ca");
        JwtAuthenticationToken auth =
            new JwtAuthenticationToken(
                jwt, AuthorityUtils.createAuthorityList(groups.toArray(new String[0])));
        assertThat(checker.isValidRouteGatePrincipal(auth))
            .as("IDIR with multi-roles " + groups + " must be rejected")
            .isFalse();
      }
    }

    @Test
    @DisplayName("Unsupported or non-IDIR/BCeID provider (e.g. BCSC) is rejected")
    void unsupportedProvider_isRejected() {
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "bcsc_user", List.of("WASTE_PLUS_ADMIN"), "bcsc", "Bcsc, User", "bcsc@gov.bc.ca");
      JwtAuthenticationToken auth =
          new JwtAuthenticationToken(
              jwt, AuthorityUtils.createAuthorityList("WASTE_PLUS_ADMIN"));
      assertThat(checker.isValidRouteGatePrincipal(auth)).isFalse();
    }

    @Test
    @DisplayName("Prefix-matching false positive such as ADMINISTRATOR is not treated as ADMIN")
    void prefixFalsePositives_areNotTreatedAsAdmin() {
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "admin_fake", List.of("WASTE_PLUS_ADMINISTRATOR_X"), "idir", "Admin, Fake", "fake@idir.ca");
      JwtAuthenticationToken auth =
          new JwtAuthenticationToken(
              jwt, AuthorityUtils.createAuthorityList("WASTE_PLUS_ADMINISTRATOR_X"));

      assertThat(checker.hasRole(auth, ca.bc.gov.nrs.hrs.dto.base.Role.ADMIN)).isFalse();
      assertThat(checker.hasAnyWriteRole(auth)).isFalse();
    }
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

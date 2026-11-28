package ca.bc.gov.nrs.hrs.extensions;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.test.context.support.WithSecurityContext;

/**
 * Test annotation that installs a mock JWT-backed Spring Security context.
 *
 * <p>Cognito-shaped attributes ({@code cognitoGroups}, {@code idp}, ...) keep their original
 * behaviour. Keycloak-shaped attributes (epic #1506) add the standard-realm claim names to the mock
 * token when set; existing tests that only use the Cognito attributes are unaffected.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
@Documented
@WithSecurityContext(factory = WithMockJwtSecurityContextFactory.class)
public @interface WithMockJwt {

  /**
   * Returns the subject value to use in the mock token.
   *
   * @return the token subject
   */
  String value() default "test";

  /**
   * Returns the Cognito groups to expose in the mock token.
   *
   * @return the token groups
   */
  String[] cognitoGroups() default {};

  /**
   * Returns the email claim to expose in the mock token.
   *
   * @return the email claim
   */
  String email() default "test@test.ca";

  /**
   * Returns the identity-provider claim to expose in the mock token.
   *
   * @return the identity provider name
   */
  String idp() default "idir";

  /**
   * Returns the display-name claim to expose in the mock token.
   *
   * @return the display name claim
   */
  String displayName() default "Test, Automated WLRS:EX";

  /**
   * Returns the Keycloak {@code identity_provider} claim (e.g. {@code azureidir}); empty to omit.
   *
   * @return the Keycloak identity provider claim
   */
  String identityProvider() default "";

  /**
   * Returns the Keycloak {@code idir_username} claim; empty to omit.
   *
   * @return the IDIR username claim
   */
  String idirUsername() default "";

  /**
   * Returns the Keycloak {@code idir_user_guid} claim; empty to omit.
   *
   * @return the IDIR user GUID claim
   */
  String idirUserGuid() default "";

  /**
   * Returns the Keycloak {@code client_roles} claim entries; empty to omit.
   *
   * @return the CSS-era FAM client roles
   */
  String[] clientRoles() default {};

  /**
   * Returns the Keycloak {@code azp} (authorized party) claim; empty to omit.
   *
   * @return the authorized party
   */
  String azp() default "";
}

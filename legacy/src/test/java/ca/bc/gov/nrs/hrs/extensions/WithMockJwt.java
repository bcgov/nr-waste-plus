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
}

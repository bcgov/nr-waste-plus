package ca.bc.gov.nrs.hrs.extensions;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.test.context.support.WithSecurityContext;

/**
 * Test annotation for injecting a mock JWT security context into test cases.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
@Documented
@WithSecurityContext(factory = WithMockJwtSecurityContextFactory.class)
public @interface WithMockJwt {
  /** The mock subject or username. */
  String value() default "test";

  /** The Cognito groups assigned to the user. */
  String[] cognitoGroups() default {};

  /** The user's email address. */
  String email() default "test@test.ca";

  /** The identity provider. */
  String idp() default "idir";

  /** The display name. */
  String displayName() default "Test, Automated WLRS:EX";
}

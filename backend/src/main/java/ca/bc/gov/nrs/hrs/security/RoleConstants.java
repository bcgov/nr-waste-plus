package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.dto.base.Role;
import org.springframework.stereotype.Component;


/**
 * Exposes role constants as Spring beans for use in SpEL expressions within {@code @PreAuthorize}
 * annotations.
 *
 * <p>The constants are available as a bean named {@code roles}
 * and allow concise expressions such as:</p>
 *
 * <pre>
 * {@code
 * @PreAuthorize("@auth.hasAbstractRole(@roles.PLANNER, '00001012')")
 * @PreAuthorize("@auth.hasConcreteRole(@roles.VIEWER)")
 * }
 * </pre>
 */
@Component("roles")
public class RoleConstants {

  /**
   * Role representing a viewer-level permission.
   */
  public static final Role VIEWER = Role.VIEWER;

  /**
   * Role representing a submitter-level permission.
   */
  public static final Role SUBMITTER = Role.SUBMITTER;

  /**
   * Role scoped to an area.
   */
  public static final Role AREA = Role.AREA;

  /**
   * Role scoped to a district.
   */
  public static final Role DISTRICT = Role.DISTRICT;

  /**
   * Administrative role with elevated privileges.
   */
  public static final Role ADMIN = Role.ADMIN;
}

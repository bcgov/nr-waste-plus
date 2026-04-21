package ca.bc.gov.nrs.hrs.entity.users;

import java.io.Serial;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Composite identifier for {@link UserBookmarkEntity}.
 *
 * <p>
 * The fields and types must match the {@code @Id} fields declared in
 * {@link UserBookmarkEntity}.
 * </p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserBookmarkEntityId implements Serializable {

  @Serial
  private static final long serialVersionUID = -54654686531L;

  private String userId;
  private Long reportingUnitId;
}


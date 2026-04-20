package ca.bc.gov.nrs.hrs.entity.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.With;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * JPA entity that caches a user's identity attributes retrieved from Cognito.
 *
 * <p>Maps to the {@code hrs.user_identity} table. Each row represents a single
 * user identified by their Cognito {@code sub} claim. Identity data is persisted
 * locally so that async workflows (email notifications, scheduled jobs) can access
 * user attributes without requiring a live Cognito call.
 * </p>
 *
 * <p>The {@link #lastSyncedAt} field is used to determine whether the record is
 * stale and needs refreshing from Cognito. The staleness threshold is configurable
 * via {@code ca.bc.gov.nrs.cognito.identity-ttl} (default 24 h).
 * </p>
 */
@Entity
@Table(name = "user_identity", schema = "hrs")
@Data
@Builder
@With
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class UserIdentityEntity {

  /**
   * Cognito subject identifier — the user's unique, immutable UUID assigned by Cognito.
   * Used as the primary key for this entity.
   */
  @Id
  @EqualsAndHashCode.Include
  private String sub;

  /**
   * The user's email address as returned by the Cognito {@code /oauth2/userInfo} endpoint.
   */
  private String email;

  /**
   * The user's full display name.
   */
  private String name;

  /**
   * The user's given (first) name.
   */
  @Column(name = "given_name")
  private String givenName;

  /**
   * The user's family (last) name.
   */
  @Column(name = "family_name")
  private String familyName;

  /**
   * The identity provider name from {@code custom:idp_name} (e.g. {@code idir},
   * {@code bceidbusiness}). Used by {@link ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil}
   * to resolve the {@link ca.bc.gov.nrs.hrs.dto.base.IdentityProvider}.
   */
  @Column(name = "idp_name")
  private String idpName;

  /**
   * The user's identifier within their identity provider, from {@code custom:idp_user_id}.
   */
  @Column(name = "idp_user_id")
  private String idpUserId;

  /**
   * The user's username within their identity provider, from {@code custom:idp_username}.
   */
  @Column(name = "idp_username")
  private String idpUsername;

  /**
   * The user's display name as set by their identity provider,
   * from {@code custom:idp_display_name} (e.g. {@code Cruz, Paulo WLRS:EX}).
   */
  @Column(name = "idp_display_name")
  private String idpDisplayName;

  /**
   * The BCeID business identifier from {@code custom:idp_business_id}.
   * Only populated for users authenticating via BCeID Business; {@code null} for IDIR users.
   */
  @Column(name = "idp_business_id")
  private String businessId;

  /**
   * The complete raw attribute map returned by the Cognito userInfo endpoint,
   * stored as JSONB so that custom or future Cognito attributes are not lost.
   */
  @Column(name = "raw_attributes", columnDefinition = "jsonb")
  @JdbcTypeCode(SqlTypes.JSON)
  private Map<String, Object> rawAttributes;

  /**
   * Timestamp of the last successful sync with Cognito.
   * Used to determine whether the record is stale and must be refreshed.
   */
  @Column(name = "last_synced_at", nullable = false)
  private Instant lastSyncedAt;

}


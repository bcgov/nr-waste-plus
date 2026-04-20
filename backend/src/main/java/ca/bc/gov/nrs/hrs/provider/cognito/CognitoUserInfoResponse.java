package ca.bc.gov.nrs.hrs.provider.cognito;

import java.util.List;
import java.util.Map;

/**
 * Immutable response DTO for the Cognito {@code /oauth2/userInfo} endpoint.
 *
 * <p>Holds standard OIDC identity claims as well as Cognito custom attributes
 * ({@code custom:idp_*}) that are present in the userInfo response but absent
 * from access tokens. The {@code groups} field maps to {@code cognito:groups}
 * which Cognito may or may not include depending on pool configuration.
 * </p>
 *
 * @param sub            the subject identifier (user's unique Cognito UUID)
 * @param email          the user's email address, or {@code null} if not present
 * @param name           the user's full display name, or {@code null} if not present
 * @param givenName      the user's given (first) name, or {@code null} if not present
 * @param familyName     the user's family (last) name, or {@code null} if not present
 * @param idpName        value of {@code custom:idp_name} (e.g. {@code idir})
 * @param idpUserId      value of {@code custom:idp_user_id}
 * @param idpUsername    value of {@code custom:idp_username}
 * @param idpDisplayName value of {@code custom:idp_display_name}
 * @param businessId     value of {@code custom:idp_business_id} (BCeID Business users only)
 * @param groups         list of Cognito group names from {@code cognito:groups}; may be empty
 * @param rawAttributes  the complete raw attribute map returned by the endpoint
 */
public record CognitoUserInfoResponse(
    String sub,
    String email,
    String name,
    String givenName,
    String familyName,
    String idpName,
    String idpUserId,
    String idpUsername,
    String idpDisplayName,
    String businessId,
    List<String> groups,
    Map<String, Object> rawAttributes
) {

}


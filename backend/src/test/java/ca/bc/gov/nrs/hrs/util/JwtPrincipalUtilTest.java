package ca.bc.gov.nrs.hrs.util;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.stream.Stream;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@DisplayName("Unit Test | JwtPrincipalUtil")
class JwtPrincipalUtilTest {

  @ParameterizedTest(name = "For custom:idp_name {0} → JwtAuthenticationToken: {1}, Jwt: {2}")
  @CsvSource({
      "ca.bc.gov.flnr.fam.dev, BCSC, BCSC",
      "idir, IDIR, IDIR",
      "bceidbusiness, BCEIDBUSINESS, BCEIDBUSINESS",
      "'', '', ''"
  })
  @DisplayName("get provider")
  void shouldGetProvider(String idpName, String expectedTokenValue, String expectedJwtValue) {
    Map<String, Object> claims = Map.of("custom:idp_name", idpName);

    assertEquals(
        expectedTokenValue,
        JwtPrincipalUtil.getProvider(createJwtAuthenticationToken(claims)));
    assertEquals(expectedJwtValue, JwtPrincipalUtil.getProvider(createJwt(claims)));
  }

  @ParameterizedTest(name = "For custom:idp_username {0} and custom:idp_name {1} userId is {2}")
  @CsvSource({
      "username, userid, ca.bc.gov.flnr.fam.dev, BCSC\\username",
      "username, userid, idir, IDIR\\username",
      "username, userid, bceidbusiness, BCEIDBUSINESS\\username",
      "'', userid, ca.bc.gov.flnr.fam.dev, BCSC\\userid",
      "'', userid, idir, IDIR\\userid",
      "'', userid, bceidbusiness, BCEIDBUSINESS\\userid",
      "'', '','', ''"
  })
  @DisplayName("get userId returns userId prefixed with provider when userId is not blank")
  void shouldGetUserId(String idpUsername, String idpUserId, String idpName, String expected) {
    Map<String, Object> claims =
        Map.of(
            "custom:idp_username", idpUsername,
            "custom:idp_user_id", idpUserId,
            "custom:idp_name", idpName);

    assertEquals(
        expected, JwtPrincipalUtil.getUserId(createJwtAuthenticationToken(claims)));
    assertEquals(expected, JwtPrincipalUtil.getUserId(createJwt(claims)));
  }

  @ParameterizedTest(name = "For custom:idp_username {0} and custom:idp_name {1} idp_username is {2}")
  @CsvSource({
      "username, userid, ca.bc.gov.flnr.fam.dev, username",
      "username, userid, idir, username",
      "username, userid, bceidbusiness, username",
      "'', userid, ca.bc.gov.flnr.fam.dev, userid",
      "'', userid, idir, userid",
      "'', userid, bceidbusiness, userid",
      "'', '','', ''"
  })
  @DisplayName("get idpUserName returns userId prefixed with provider when userId is not blank")
  void shouldGetIdpUsername(String idpUsername, String idpUserId, String idpName, String expected) {
    Map<String, Object> claims =
        Map.of(
            "custom:idp_username", idpUsername,
            "custom:idp_user_id", idpUserId,
            "custom:idp_name", idpName);

    assertEquals(
        expected,
        JwtPrincipalUtil.getIdpUsername(createJwtAuthenticationToken(claims)));
    assertEquals(expected, JwtPrincipalUtil.getIdpUsername(createJwt(claims)));
  }

  @ParameterizedTest(name = "For custom:idp_username {0} and custom:idp_name {1} provider is {2}")
  @CsvSource({
      "username, userid, ca.bc.gov.flnr.fam.dev, BCSC",
      "username, userid, idir, IDIR",
      "username, userid, bceidbusiness, BUSINESS_BCEID",
      "'', '','', ''"
  })
  @DisplayName("get userId returns userId prefixed with provider when userId is not blank")
  void shouldGetIdentityProvider(String idpUsername, String idpUserId, String idpName,
      String expected) {
    Map<String, Object> claims =
        Map.of(
            "custom:idp_username", idpUsername,
            "custom:idp_user_id", idpUserId,
            "custom:idp_name", idpName);

    if (StringUtils.isBlank(expected)) {
      assertThrows(
          NoSuchElementException.class,
          () -> JwtPrincipalUtil.getIdentityProvider(
              createJwtAuthenticationToken(claims)));
      assertThrows(
          NoSuchElementException.class,
          () -> JwtPrincipalUtil.getIdentityProvider(createJwt(claims))
      );
    } else {

      assertEquals(
          IdentityProvider.valueOf(expected),
          JwtPrincipalUtil.getIdentityProvider(createJwtAuthenticationToken(claims)));
      assertEquals(IdentityProvider.valueOf(expected),
          JwtPrincipalUtil.getIdentityProvider(createJwt(claims)));
    }
  }

  @ParameterizedTest(name = "For custom:idp_business_id {0} id is {1}")
  @ValueSource(strings = {"businessId", ""})
  @DisplayName("get businessId")
  void shouldGetBusinessId(String value) {
    Map<String, Object> claims = Map.of("custom:idp_business_id", value);

    assertEquals(
        value, JwtPrincipalUtil.getBusinessId(createJwtAuthenticationToken(claims)));
    assertEquals(value, JwtPrincipalUtil.getBusinessId(createJwt(claims)));
  }

  @ParameterizedTest(name = "For custom:idp_business_name {0} name is {1}")
  @ValueSource(strings = {"The Business Name", ""})
  @DisplayName("get businessName")
  void shouldGetBusinessName(String value) {
    Map<String, Object> claims = Map.of("custom:idp_business_name", value);

    assertEquals(
        value,
        JwtPrincipalUtil.getBusinessName(createJwtAuthenticationToken(claims)));
    assertEquals(value, JwtPrincipalUtil.getBusinessName(createJwt(claims)));
  }

  @ParameterizedTest(name = "For email {0} email is {1}")
  @ValueSource(strings = {"my_email_is@mail.ca", ""})
  @DisplayName("get email")
  void shouldGetEmail(String value) {
    Map<String, Object> claims = Map.of("email", value);

    assertEquals(
        value, JwtPrincipalUtil.getEmail(createJwtAuthenticationToken(claims)));
    assertEquals(value, JwtPrincipalUtil.getEmail(createJwt(claims)));
  }

  @ParameterizedTest(
      name =
          "For given_name {0} family_name {1} custom:idp_display_name {2} custom:idp_name {3}"
          + " fullname is {4}")
  @CsvSource({
      "John, Wick, '',  ca.bc.gov.flnr.fam.dev, John Wick",
      "John, Wick, '',  idir, John Wick",
      "'', '', 'John Wick',  bceidbusiness, John Wick",
      "'', '', 'John Valeus Wick',  bceidbusiness, John Valeus Wick",
      "'', '', 'Wick, John WLRS:EX',  idir, John Wick",
      "'', '', 'da Silva, Anderson WLRS:EX',  idir, Anderson Silva",
      "'', '', 'Wick, John V WLRS:EX',  idir, John Wick",
      "'', '', '',  bceidbusiness, ''",
      "'', '', '', '', ''"
  })
  @DisplayName("get name")
  void shouldGetName(
      String givenName, String familyName, String displayName, String idpName, String expected) {
    Map<String, Object> claims =
        Map.of(
            "given_name", givenName,
            "family_name", familyName,
            "custom:idp_name", idpName,
            "custom:idp_display_name", displayName);

    assertEquals(
        expected, JwtPrincipalUtil.getName(createJwtAuthenticationToken(claims)));
    assertEquals(expected, JwtPrincipalUtil.getName(createJwt(claims)));
  }

  @ParameterizedTest(
      name =
          "For given_name {0} family_name {1} custom:idp_display_name {2} custom:idp_name {3}"
          + " last name is {4}")
  @CsvSource({
      "John, Wick, '',  ca.bc.gov.flnr.fam.dev, Wick",
      "John, Wick, '',  idir, Wick",
      "'', '', 'John Wick',  bceidbusiness, Wick",
      "'', '', 'John Valeus Wick',  bceidbusiness, Valeus Wick",
      "'', '', 'Wick, John WLRS:EX',  idir, Wick",
      "'', '', 'da Silva, Anderson WLRS:EX',  idir, Silva",
      "'', '', 'Wick, John V WLRS:EX',  idir, Wick",
      "'', '', '',  bceidbusiness, ''",
      "'', '', '', '', ''"
  })
  @DisplayName("get last name")
  void shouldGetLastName(
      String givenName, String familyName, String displayName, String idpName, String expected) {
    Map<String, Object> claims =
        Map.of(
            "given_name", givenName,
            "family_name", familyName,
            "custom:idp_name", idpName,
            "custom:idp_display_name", displayName);

    assertEquals(
        expected, JwtPrincipalUtil.getLastName(createJwtAuthenticationToken(claims)));
    assertEquals(expected, JwtPrincipalUtil.getLastName(createJwt(claims)));
  }

  @ParameterizedTest(
      name =
          "For given_name {0} family_name {1} custom:idp_display_name {2} custom:idp_name {3}"
          + " first name is {4}")
  @CsvSource({
      "John, Wick, '',  ca.bc.gov.flnr.fam.dev, John",
      "John, Wick, '',  idir, John",
      "'', '', 'John Wick',  bceidbusiness, John",
      "'', '', 'John Valeus Wick',  bceidbusiness, John",
      "'', '', 'Wick, John WLRS:EX',  idir, John",
      "'', '', 'da Silva, Anderson WLRS:EX',  idir, Anderson",
      "'', '', 'Wick, John V WLRS:EX',  idir, John",
      "'', '', '',  bceidbusiness, ''",
      "'', '', '', '', ''"
  })
  @DisplayName("get first name")
  void shouldGetFirstName(
      String givenName, String familyName, String displayName, String idpName, String expected) {
    Map<String, Object> claims =
        Map.of(
            "given_name", givenName,
            "family_name", familyName,
            "custom:idp_name", idpName,
            "custom:idp_display_name", displayName);

    assertEquals(expected,
        JwtPrincipalUtil.getFirstName(createJwtAuthenticationToken(claims)));
    assertEquals(expected, JwtPrincipalUtil.getFirstName(createJwt(claims)));
  }

  @ParameterizedTest(
      name =
          "For given_name {0} family_name {1} custom:idp_display_name {2} custom:idp_name {3}"
          + " first name is {4}")
  @CsvSource({
      "John, Wick, '',  ca.bc.gov.flnr.fam.dev, ''",
      "John, Wick, '',  idir,  ''",
      "'', '', 'John Wick',  bceidbusiness, John Wick",
      "'', '', 'John Valeus Wick',  bceidbusiness, John Valeus Wick",
      "'', '', 'Wick, John WLRS:EX',  idir, 'Wick, John WLRS:EX'",
      "'', '', 'da Silva, Anderson WLRS:EX',  idir, 'da Silva, Anderson WLRS:EX'",
      "'', '', 'Wick, John V WLRS:EX',  idir, 'Wick, John V WLRS:EX'",
      "'', '', '',  bceidbusiness, ''",
      "'', '', '', '', ''"
  })
  @DisplayName("get display name")
  void shouldGetDisplayName(
      String givenName, String familyName, String displayName, String idpName, String expected) {
    Map<String, Object> claims =
        Map.of(
            "given_name", givenName,
            "family_name", familyName,
            "custom:idp_name", idpName,
            "custom:idp_display_name", displayName);

    assertEquals(expected,
        JwtPrincipalUtil.getDisplayName(createJwtAuthenticationToken(claims)));
    assertEquals(expected, JwtPrincipalUtil.getDisplayName(createJwt(claims)));
  }

  @Test
  @DisplayName("Parse role")
  void shouldGetRoles() {

    Map<String, Object> claims =
        Map.of(
            "cognito:groups", List.of(
                "Viewer",
                "Submitter_00012120",
                "Approver_00010040",
                "Admin_00000111"
            )
        );

    Map<Role, List<String>> result = Map.of(
        Role.ADMIN, List.of(),
        Role.SUBMITTER, List.of("00012120"),
        Role.VIEWER, List.of("00010040"),
        Role.DISTRICT, List.of()
    );

    assertEquals(result,
        JwtPrincipalUtil.getRoles(
            createJwtAuthenticationToken(claims)
        )
    );
    assertEquals(result,
        JwtPrincipalUtil.getRoles(
            createJwt(claims)
        )
    );
  }

  @ParameterizedTest
  @MethodSource("clients")
  @DisplayName("Parse client numbers")
  void shouldGetClients(Map<String, Object> claims, List<String> result) {
    if(result.isEmpty()){
      assertThat(
          JwtPrincipalUtil.getClientFromRoles(createJwtAuthenticationToken(claims))
      ).isEmpty();

      assertThat(JwtPrincipalUtil.getClientFromRoles(createJwt(claims))
      ).isEmpty();
    }else {
      assertThat(
          JwtPrincipalUtil.getClientFromRoles(createJwtAuthenticationToken(claims))
      )
          .isNotNull()
          .isNotEmpty()
          .hasSize(result.size())
          .containsExactlyInAnyOrderElementsOf(result);

      assertThat(JwtPrincipalUtil.getClientFromRoles(createJwt(claims)))
          .isNotNull()
          .isNotEmpty()
          .hasSize(result.size())
          .containsExactlyInAnyOrderElementsOf(result);
    }
  }

  @ParameterizedTest
  @MethodSource("concreteRoles")
  @DisplayName("has concrete role?")
  void shouldCheckConcreteRole(Map<String, Object> claims, Role role, boolean result) {
    assertEquals(result,
        JwtPrincipalUtil.hasConcreteRole(createJwtAuthenticationToken(claims),
            role)
    );

    assertEquals(result,JwtPrincipalUtil.hasConcreteRole(createJwt(claims), role));
  }

  @ParameterizedTest
  @MethodSource("abstractRoles")
  @DisplayName("has abstract role?")
  void shouldCheckAbstractRole(
      Map<String, Object> claims,
      Role role,
      String client,
      boolean result
  ) {
    assertEquals(result,
        JwtPrincipalUtil.hasAbstractRole(
            createJwtAuthenticationToken(claims),
            role,
            client
        )
    );

    assertEquals(result,
        JwtPrincipalUtil.hasAbstractRole(
            createJwt(claims),
            role,
            client
        )
    );
  }

  private JwtAuthenticationToken createJwtAuthenticationToken(
      Map<String, Object> attributes) {
    return new JwtAuthenticationToken(createJwt(attributes), List.of());
  }

  private static @NotNull Jwt createJwt(Map<String, Object> attributes) {
    return new Jwt(
        "token",
        LocalDateTime.now().minusMinutes(10).toInstant(ZoneOffset.UTC),
        LocalDateTime.now().plusMinutes(90).toInstant(ZoneOffset.UTC),
        Map.of("alg", "HS256", "typ", "JWT"),
        attributes);
  }

  @ParameterizedTest
  @DisplayName("getGroups should return expected group list")
  @MethodSource("provideGroupsTestData")
  void shouldGetGroups(Map<String, Object> tokenAttributes, Set<String> expectedGroups) {
    JwtAuthenticationToken jwtAuthenticationToken =
        tokenAttributes == null
            ? null
            : createJwtAuthenticationToken(tokenAttributes);

    Set<String> actualGroups = JwtPrincipalUtil.getGroups(jwtAuthenticationToken);

    assertEquals(expectedGroups, actualGroups);
  }

  private static Stream<Arguments> provideGroupsTestData() {
    return Stream.of(
        Arguments.of(Map.of("cognito:groups", List.of("CLIENT_ADMIN")), Set.of("CLIENT_ADMIN")),
        Arguments.of(Map.of("cognito:groups", List.of()), Set.of()),
        Arguments.of(
            new HashMap<>() {
              {
                put("cognito:groups", null);
              }
            },
            Set.of()),
        Arguments.of(Map.of("otherKey", "someValue"), Set.of()),
        Arguments.of(null, Set.of()));
  }

  private static Stream<Arguments> concreteRoles(){
    return
        Stream.of(
            Arguments.argumentSet(
                "Concrete role I have",
                Map.of(
                    "cognito:groups", List.of(
                        "Viewer",
                        "Submitter_00012120",
                        "Approver_00010040",
                        "Admin_00000111"
                    )
                ),
                Role.VIEWER,
                true
            ),
            Arguments.argumentSet(
                "Concrete role I don't have",
                Map.of(
                    "cognito:groups", List.of(
                        "Submitter_00012120",
                        "Approver_00010040",
                        "Admin_00000111"
                    )
                ),
                Role.VIEWER,
                false
            ),
            Arguments.argumentSet(
                "Abstract role I have",
                Map.of(
                    "cognito:groups", List.of(
                        "Viewer",
                        "Submitter_00012120",
                        "Approver_00010040",
                        "Admin_00000111"
                    )
                ),
                Role.ADMIN,
                false
            ),
            Arguments.argumentSet(
                "Abstract role I don't have",
                Map.of(
                    "cognito:groups", List.of(
                        "Viewer",
                        "Submitter_00012120",
                        "Approver_00010040"
                    )
                ),
                Role.ADMIN,
                false
            )
        );
  }

  private static Stream<Arguments> abstractRoles(){
    return
        Stream.of(
            Arguments.argumentSet(
                "Concrete role I have for client 00012120",
                Map.of(
                    "cognito:groups", List.of(
                        "Viewer",
                        "Submitter_00012120",
                        "Approver_00010040",
                        "Admin_00000111"
                    )
                ),
                Role.VIEWER,
                "00012120",
                false
            ),
            Arguments.argumentSet(
                "Concrete role I don't have for client 00012120",
                Map.of(
                    "cognito:groups", List.of(
                        "Submitter_00012120",
                        "Approver_00010040",
                        "Admin_00000111"
                    )
                ),
                Role.VIEWER,
                "00012120",
                false
            ),
            Arguments.argumentSet(
                "Abstract role I have for client 00000111",
                Map.of(
                    "cognito:groups", List.of(
                        "Viewer",
                        "Submitter_00012120",
                        "Approver_00010040",
                        "Admin_00000111"
                    )
                ),
                Role.ADMIN,
                "00000111",
                true
            ),
            Arguments.argumentSet(
                "Abstract role I don't have for client 00000111",
                Map.of(
                    "cognito:groups", List.of(
                        "Viewer",
                        "Submitter_00012120",
                        "Approver_00010040"
                    )
                ),
                Role.ADMIN,
                "00000111",
                false
            ),
            Arguments.argumentSet(
                "Abstract role I have for client 00000112 that I don't have",
                Map.of(
                    "cognito:groups", List.of(
                        "Viewer",
                        "Submitter_00012120",
                        "Approver_00010040",
                        "Admin_00000111"
                    )
                ),
                Role.ADMIN,
                "00000112",
                false
            )
        );
  }

  private static Stream<Arguments> clients(){
    return
        Stream.of(
            Arguments.argumentSet(
                "Only concrete roles",
                Map.of(
                    "cognito:groups", List.of(
                        "Viewer"
                    )
                ),
                List.of()
            ),
            Arguments.argumentSet(
                "Abstract with clients in all",
                Map.of(
                    "cognito:groups", List.of(
                        "Submitter_00012120",
                        "Approver_00010040",
                        "Admin_00000111"
                    )
                ),
                List.of("00010040", "00012120", "00000111")
            ),
            Arguments.argumentSet(
                "Abstract with clients in some",
                Map.of(
                    "cognito:groups", List.of(
                        "Submitter_00012120",
                        "Approver",
                        "Admin_00000111"
                    )
                ),
                List.of("00012120", "00000111")
            )

        );
  }
}

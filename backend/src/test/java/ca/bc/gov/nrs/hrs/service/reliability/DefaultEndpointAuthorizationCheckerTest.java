package ca.bc.gov.nrs.hrs.service.reliability;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwtSecurityContextFactory;
import ca.bc.gov.nrs.hrs.security.ResourceScopeGuard;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
@DisplayName("Default endpoint authorization checker")
class DefaultEndpointAuthorizationCheckerTest {

  @Mock
  private ResourceScopeGuard resourceScopeGuard;

  private DefaultEndpointAuthorizationChecker checker;

  @BeforeEach
  void setUp() {
    checker = new DefaultEndpointAuthorizationChecker(resourceScopeGuard);
  }

  @Test
  @DisplayName("allows replay when guard passes for reporting unit")
  void shouldAllowReplayWhenGuardPasses() {
    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "bceid-user",
        List.of("WASTE_PLUS_SUBMITTER_00012797"),
        "bceidbusiness",
        "BCeID User",
        "bceid@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());

    MockHttpServletRequest request =
        new MockHttpServletRequest(
            "POST", "/api/reporting-units/100/blocks/1/attachments/2/finalize");

    doNothing().when(resourceScopeGuard).verify(auth, 100L, "POST");

    assertThatCode(() -> checker.checkAuthorization(request, auth)).doesNotThrowAnyException();
    verify(resourceScopeGuard).verify(auth, 100L, "POST");
  }

  @Test
  @DisplayName("rejects replay when guard rejects reporting unit")
  void shouldRejectReplayWhenGuardRejects() {
    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "bceid-user",
        List.of("WASTE_PLUS_SUBMITTER_99999999"),
        "bceidbusiness",
        "BCeID User",
        "bceid@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());

    MockHttpServletRequest request =
        new MockHttpServletRequest(
            "POST", "/api/reporting-units/100/blocks/1/attachments/2/finalize");

    doThrow(new ReportingUnitNotFoundException(100L))
        .when(resourceScopeGuard)
        .verify(auth, 100L, "POST");

    assertThatThrownBy(() -> checker.checkAuthorization(request, auth))
        .isInstanceOf(ReportingUnitNotFoundException.class);
  }

  @Test
  @DisplayName("allows replay for non-reporting-unit endpoint")
  void shouldAllowReplayForNonReportingUnitPath() {
    MockHttpServletRequest request =
        new MockHttpServletRequest("POST", "/api/configuration/district-average-volumes");

    assertThatCode(() -> checker.checkAuthorization(request, null)).doesNotThrowAnyException();
    verifyNoInteractions(resourceScopeGuard);
  }

  @Test
  @DisplayName("rejects replay with 403 Forbidden when reporting unit id is not a valid Long")
  void shouldRejectReplayWhenReportingUnitIdCannotBeParsed() {
    MockHttpServletRequest request =
        new MockHttpServletRequest(
            "POST", "/api/reporting-units/999999999999999999999999999999/finalize");

    assertThatThrownBy(() -> checker.checkAuthorization(request, null))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining(
            "Invalid reporting unit identifier: 999999999999999999999999999999");
    verifyNoInteractions(resourceScopeGuard);
  }

  @Test
  @DisplayName("allows replay creation when caller retains submitter role for client")
  void shouldAllowReplayCreationWhenCallerHasMatchingSubmitterRole() throws Exception {
    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "submitter-user",
        List.of("WASTE_PLUS_SUBMITTER_00012797"),
        "bceidbusiness",
        "Submitter User",
        "submitter@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());

    MockHttpServletRequest rawRequest =
        new MockHttpServletRequest("POST", "/api/reporting-units");
    rawRequest.setContent("{\"clientNumber\": \"00012797\"}".getBytes());
    CachedBodyHttpServletRequest request =
        new CachedBodyHttpServletRequest(rawRequest, 1024 * 1024);

    assertThatCode(() -> checker.checkAuthorization(request, auth)).doesNotThrowAnyException();
    verifyNoInteractions(resourceScopeGuard);
  }

  @Test
  @DisplayName("allows replay creation when IDIR district caller matches district")
  void shouldAllowReplayCreationWhenIdirDistrictMatches() throws Exception {
    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "district-user",
        List.of("WASTE_PLUS_DISTRICT_DKM"),
        "idir",
        "District User",
        "district@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());
    when(resourceScopeGuard.extractAssignedDistricts(jwt)).thenReturn(Set.of("DKM"));

    MockHttpServletRequest rawRequest =
        new MockHttpServletRequest("POST", "/api/reporting-units");
    rawRequest.setContent("{\"clientNumber\": \"00012797\", \"districtCode\": \"DKM\"}".getBytes());
    CachedBodyHttpServletRequest request =
        new CachedBodyHttpServletRequest(rawRequest, 1024 * 1024);

    assertThatCode(() -> checker.checkAuthorization(request, auth)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("rejects replay creation when IDIR district caller does not match district")
  void shouldRejectReplayCreationWhenIdirDistrictMismatches() throws Exception {
    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "district-user",
        List.of("WASTE_PLUS_DISTRICT_DKM"),
        "idir",
        "District User",
        "district@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());
    when(resourceScopeGuard.extractAssignedDistricts(jwt)).thenReturn(Set.of("DKM"));

    MockHttpServletRequest rawRequest =
        new MockHttpServletRequest("POST", "/api/reporting-units");
    rawRequest.setContent("{\"clientNumber\": \"00012797\", \"districtCode\": \"DCC\"}".getBytes());
    CachedBodyHttpServletRequest request =
        new CachedBodyHttpServletRequest(rawRequest, 1024 * 1024);

    assertThatThrownBy(() -> checker.checkAuthorization(request, auth))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("User is not authorized to create a reporting unit for district DCC");
  }

  @Test
  @DisplayName("allows replay creation when caller has privileged role")
  void shouldAllowReplayCreationWhenCallerHasPrivilegedRole() throws Exception {
    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "admin-user",
        List.of("WASTE_PLUS_ADMIN"),
        "idir",
        "Admin User",
        "admin@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());

    MockHttpServletRequest rawRequest =
        new MockHttpServletRequest("POST", "/api/reporting-units");
    rawRequest.setContent("{\"clientNumber\": \"00012797\"}".getBytes());
    CachedBodyHttpServletRequest request =
        new CachedBodyHttpServletRequest(rawRequest, 1024 * 1024);

    assertThatCode(() -> checker.checkAuthorization(request, auth)).doesNotThrowAnyException();
    verifyNoInteractions(resourceScopeGuard);
  }

  @Test
  @DisplayName("rejects replay creation with 403 Forbidden when caller lacks role for client")
  void shouldRejectReplayCreationWhenCallerLacksRoleForClient() throws Exception {
    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "revoked-user",
        List.of("WASTE_PLUS_SUBMITTER_99999999"),
        "bceidbusiness",
        "Revoked User",
        "revoked@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());

    MockHttpServletRequest rawRequest =
        new MockHttpServletRequest("POST", "/api/reporting-units");
    rawRequest.setContent("{\"clientNumber\": \"00012797\"}".getBytes());
    CachedBodyHttpServletRequest request =
        new CachedBodyHttpServletRequest(rawRequest, 1024 * 1024);

    assertThatThrownBy(() -> checker.checkAuthorization(request, auth))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("User is not authorized to create a reporting unit for client 00012797");
    verifyNoInteractions(resourceScopeGuard);
  }

  @Test
  @DisplayName("allows replay creation when caller has an authorized elevated role")
  void shouldAllowReplayCreationWhenCallerHasAuthorizedElevatedRole() throws Exception {
    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "admin-user",
        List.of("WASTE_PLUS_ADMIN"),
        "idir",
        "Admin User",
        "admin@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());
    MockHttpServletRequest rawRequest =
        new MockHttpServletRequest("POST", "/api/reporting-units");
    rawRequest.setContent("{\"clientNumber\": \"00012797\"}".getBytes());
    CachedBodyHttpServletRequest request = new CachedBodyHttpServletRequest(rawRequest, 1024 * 1024);

    assertThatCode(() -> checker.checkAuthorization(request, auth)).doesNotThrowAnyException();
    verifyNoInteractions(resourceScopeGuard);
  }

  @Test
  @DisplayName("rejects replay creation when authenticated principal is not a JWT")
  void shouldRejectReplayCreationForNonJwtPrincipal() throws Exception {
    Authentication auth = new UsernamePasswordAuthenticationToken("user", "n/a", List.of());
    MockHttpServletRequest rawRequest =
        new MockHttpServletRequest("POST", "/api/reporting-units");
    rawRequest.setContent("{\"clientNumber\": \"00012797\"}".getBytes());
    CachedBodyHttpServletRequest request = new CachedBodyHttpServletRequest(rawRequest, 1024 * 1024);

    assertThatThrownBy(() -> checker.checkAuthorization(request, auth))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("Authenticated caller is not authorized");
    verifyNoInteractions(resourceScopeGuard);
  }

  @Test
  @DisplayName("rejects replay creation when caller is unauthenticated")
  void shouldRejectReplayCreationWhenCallerIsUnauthenticated() throws Exception {
    MockHttpServletRequest rawRequest =
        new MockHttpServletRequest("POST", "/api/reporting-units");
    rawRequest.setContent("{\"clientNumber\": \"00012797\"}".getBytes());
    CachedBodyHttpServletRequest request =
        new CachedBodyHttpServletRequest(rawRequest, 1024 * 1024);

    assertThatThrownBy(() -> checker.checkAuthorization(request, null))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("Unauthenticated caller is not authorized to create a reporting unit");
    verifyNoInteractions(resourceScopeGuard);
  }

  @Test
  @DisplayName("rejects replay creation when request body has missing or blank clientNumber")
  void shouldRejectReplayCreationWhenBodyIsMissingClientNumber() throws Exception {
    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "admin-user",
        List.of("WASTE_PLUS_ADMIN"),
        "idir",
        "Admin User",
        "admin@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());

    MockHttpServletRequest rawRequest =
        new MockHttpServletRequest("POST", "/api/reporting-units");
    rawRequest.setContent("{}".getBytes());
    CachedBodyHttpServletRequest request =
        new CachedBodyHttpServletRequest(rawRequest, 1024 * 1024);

    assertThatThrownBy(() -> checker.checkAuthorization(request, auth))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("Missing or invalid client number in reporting unit creation request");
    verifyNoInteractions(resourceScopeGuard);
  }
}

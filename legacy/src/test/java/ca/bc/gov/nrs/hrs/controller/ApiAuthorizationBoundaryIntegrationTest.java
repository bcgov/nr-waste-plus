package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.service.codes.AssessAreaStatusService;
import ca.bc.gov.nrs.hrs.service.codes.DistrictService;
import ca.bc.gov.nrs.hrs.service.codes.SamplingService;
import ca.bc.gov.nrs.hrs.service.reportingunit.ReportingUnitSearchService;
import ca.bc.gov.nrs.hrs.service.reportingunit.ReportingUnitService;
import ca.bc.gov.nrs.hrs.service.search.AdvancedSearchService;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Negative authorization coverage for the supported legacy HTTP boundary.
 *
 * <p>The legacy application authorizes by authentication only: {@code /api/**} requires an
 * authenticated principal, {@code /metrics} requires an authenticated principal, and
 * {@code /actuator/health} is public. No route or method is restricted by role —
 * {@code ApiAuthorizationCustomizer} registers no role-based rule and no production type carries
 * a {@code @PreAuthorize} constraint — so a role-denied 403 does not exist in this application
 * and is deliberately not asserted here.</p>
 *
 * <p>Every denial below has to happen in the security filter chain before any controller or
 * service is invoked, which is what the mocked business-component interactions prove. Unsafe
 * methods are additionally refused by {@code CsrfFilter} ahead of the authentication entry point,
 * so an anonymous {@code POST} is reported as {@code 403} while an anonymous {@code GET} is
 * reported as {@code 401}.</p>
 */
@AutoConfigureMockMvc
@DisplayName("Integrated Test | API Authorization Boundary")
class ApiAuthorizationBoundaryIntegrationTest
    extends AbstractTestContainerIntegrationTest {

  private static final MediaType JSON = MediaType.APPLICATION_JSON;

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private ReportingUnitSearchService reportingUnitSearchService;

  @MockitoBean
  private AdvancedSearchService advancedSearchService;

  @MockitoBean
  private ReportingUnitService reportingUnitService;

  @MockitoBean
  private DistrictService districtService;

  @MockitoBean
  private SamplingService samplingService;

  @MockitoBean
  private AssessAreaStatusService assessAreaStatusService;

  private void assertNoBusinessComponentInvoked() {
    verifyNoInteractions(
        reportingUnitSearchService,
        advancedSearchService,
        reportingUnitService,
        districtService,
        samplingService,
        assessAreaStatusService
    );
  }

  static Stream<Arguments> protectedRoutes() {
    return Stream.of(
        Arguments.of("reporting unit search", "/api/search/reporting-units"),
        Arguments.of(
            "expanded reporting unit search",
            "/api/search/reporting-units/ex/879/1"
        ),
        Arguments.of(
            "reporting unit user search",
            "/api/search/reporting-units-users?userId=a"
        ),
        Arguments.of("my forest clients", "/api/search/my-forest-clients"),
        Arguments.of("district codes", "/api/codes/districts"),
        Arguments.of("sampling codes", "/api/codes/samplings"),
        Arguments.of("assess area status codes", "/api/codes/assess-area-statuses"),
        Arguments.of("reporting unit details", "/api/reporting-units/879"),
        Arguments.of("metrics endpoint", "/metrics")
    );
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("protectedRoutes")
  @DisplayName("should return 401 before the controller for an anonymous request")
  void shouldReturn401BeforeController_whenRequestIsAnonymous(String name, String uri)
      throws Exception {
    mockMvc
        .perform(get(uri).accept(JSON))
        .andExpect(status().isUnauthorized());

    assertNoBusinessComponentInvoked();
  }

  @Test
  @DisplayName("should return 401 before the controller for an anonymous OPTIONS request")
  void shouldReturn401BeforeController_whenOptionsRequestIsAnonymous() throws Exception {
    mockMvc
        .perform(options("/api/search/reporting-units").accept(JSON))
        .andExpect(status().isUnauthorized());

    assertNoBusinessComponentInvoked();
  }

  @Test
  @DisplayName("should return 403 before the controller for an anonymous create request")
  void shouldReturn403BeforeController_whenCreateRequestIsAnonymous() throws Exception {
    // CsrfFilter runs ahead of the authentication entry point, so an unsafe method without a
    // CSRF token is refused as forbidden before Spring Security reports the missing credentials.
    mockMvc
        .perform(
            post("/api/reporting-units")
                .contentType(JSON)
                .accept(JSON)
                .content("{}")
        )
        .andExpect(status().isForbidden());

    assertNoBusinessComponentInvoked();
  }

  @Test
  @WithMockJwt
  @DisplayName("should return 403 before the controller when the CSRF token is missing")
  void shouldReturn403BeforeController_whenCsrfTokenIsMissing() throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units")
                .contentType(JSON)
                .accept(JSON)
                .content("{}")
        )
        .andExpect(status().isForbidden());

    assertNoBusinessComponentInvoked();
  }

  @Test
  @DisplayName("should return 401 before the controller when the CSRF token is supplied "
      + "without authentication")
  void shouldReturn401BeforeController_whenCsrfTokenSuppliedWithoutAuthentication()
      throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(JSON)
                .accept(JSON)
                .content("{}")
        )
        .andExpect(status().isUnauthorized());

    assertNoBusinessComponentInvoked();
  }

  @Test
  @DisplayName("should keep the health endpoint public without authentication")
  void shouldKeepHealthEndpointPublic_whenRequestIsAnonymous() throws Exception {
    mockMvc
        .perform(get("/actuator/health").accept(JSON))
        .andExpect(status().isOk())
        .andExpect(header().doesNotExist(HttpHeaders.WWW_AUTHENTICATE));
  }

}

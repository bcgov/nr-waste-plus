package ca.bc.gov.nrs.hrs.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto;
import ca.bc.gov.nrs.hrs.service.reportingunit.ReportingUnitService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@AutoConfigureMockMvc
@DisplayName("Integrated Test | Reporting Unit Details Endpoint")
@WithMockJwt
class ReportingUnitControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  // -----------------------------------------------------------------------
  // GET /api/reporting-units/{id} — happy path (IDIR, unrestricted)
  // -----------------------------------------------------------------------

  @Test
  @DisplayName("should return reporting unit details for an existing RU when user is IDIR")
  void shouldReturnReportingUnitDetails_whenIdirUserAndRuExists() throws Exception {
    mockMvc
        .perform(
            get("/api/reporting-units/{id}", 879)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.clientNumber").value("00001271"))
        .andExpect(jsonPath("$.clientLocnCode").value("00"))
        .andExpect(jsonPath("$.sampling.code").value("AGR"))
        .andExpect(jsonPath("$.district.code").value("DSS"))
        .andReturn();
  }

  @Test
  @DisplayName("should return 404 when the reporting unit does not exist")
  void shouldReturn404_whenReportingUnitNotFound() throws Exception {
    mockMvc
        .perform(
            get("/api/reporting-units/{id}", 999999999)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andReturn();
  }

  // -----------------------------------------------------------------------
  // GET /api/reporting-units/{id} — non-IDIR with matching client
  // -----------------------------------------------------------------------

  @Test
  @DisplayName("should return reporting unit details when non-IDIR user has matching client number")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"Submitter_00001271"}
  )
  void shouldReturnReportingUnitDetails_whenBceidUserHasMatchingClient() throws Exception {
    mockMvc
        .perform(
            get("/api/reporting-units/{id}", 879)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.clientNumber").value("00001271"))
        .andReturn();
  }

  @Test
  @DisplayName("should return 404 when non-IDIR user does not have the matching client")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"Submitter_00099999"}
  )
  void shouldReturn404_whenBceidUserLacksMatchingClient() throws Exception {
    mockMvc
        .perform(
            get("/api/reporting-units/{id}", 879)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andReturn();
  }

}


// -----------------------------------------------------------------------
// Moved unit-style controller tests (previously in ReportingUnitControllerTest)
// These run as plain Mockito/JUnit tests (no Spring context) and were moved
// here to keep controller-related tests together while preserving the
// existing integration tests above.
// -----------------------------------------------------------------------

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit-style Tests | ReportingUnitController (moved)")
class ReportingUnitControllerMovedUnitTests {

  @Mock
  private ReportingUnitService service;

  private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper();

  private void setUp() {
    ReportingUnitController controller = new ReportingUnitController(service);
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

  private static Jwt createJwt(Map<String, Object> claims) {
    return new Jwt(
        "token",
        LocalDateTime.now().minusMinutes(10).toInstant(ZoneOffset.UTC),
        LocalDateTime.now().plusMinutes(90).toInstant(ZoneOffset.UTC),
        Map.of("alg", "none"),
        claims
    );
  }

  @Test
  @DisplayName("POST /api/reporting-units should return 201 and id when creation succeeds")
  void shouldReturnCreatedAndId_whenCreationSucceeds() throws Exception {
    setUp();

    CreateReportingUnitRequestDto request = new CreateReportingUnitRequestDto(
        "00001271",
        "DKM",
        "AGR",
        null
    );

    Jwt jwt = createJwt(Map.of("custom:idp_name", "bceidbusiness", "custom:idp_username", "user"));
    JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, java.util.List.of());

    when(service.createReportingUnit(any(CreateReportingUnitRequestDto.class), any(String.class)))
        .thenReturn(123L);

    mockMvc.perform(post("/api/reporting-units")
            .principal(auth)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(content().string("123"));
  }

  @Test
  @DisplayName("POST /api/reporting-units should return 400 when request is invalid")
  void shouldReturnBadRequest_whenInvalid() throws Exception {
    setUp();

    CreateReportingUnitRequestDto request = new CreateReportingUnitRequestDto(
        "",
        "DKM",
        "AGR",
        null
    );

    Jwt jwt = createJwt(Map.of("custom:idp_name", "bceidbusiness", "custom:idp_username", "user"));
    JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, java.util.List.of());

    mockMvc.perform(post("/api/reporting-units")
            .principal(auth)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

}


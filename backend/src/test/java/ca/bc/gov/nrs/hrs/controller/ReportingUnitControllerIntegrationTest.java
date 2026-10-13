package ca.bc.gov.nrs.hrs.controller;

import static ca.bc.gov.nrs.hrs.TestConstants.LEGACY_RU_DETAILS;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.notFound;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doReturn;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Reporting Unit Controller")
class ReportingUnitControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @RegisterExtension
  static WireMockExtension clientApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .port(10000)
                  .notifier(new WiremockLogNotifier())
                  .asynchronousResponseEnabled(true)
                  .stubRequestLoggingDisabled(false))
          .configureStaticDsl(true)
          .build();

  @RegisterExtension
  static WireMockExtension legacyApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .port(10001)
                  .notifier(new WiremockLogNotifier())
                  .asynchronousResponseEnabled(true)
                  .stubRequestLoggingDisabled(false))
          .configureStaticDsl(true)
          .build();

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private JsonMapper jsonMapper;

  @Autowired private JdbcTemplate jdbcTemplate;
  @Autowired private TransactionTemplate transactionTemplate;

  private String fixtureActor;
  private Long populatedReportingUnitId;
  private Long emptyReportingUnitId;

  @Autowired
  private CircuitBreakerRegistry circuitBreakerRegistry;

  @Autowired
  private RetryRegistry retryRegistry;

  @MockitoSpyBean
  private FeatureFlagsConfiguration featureFlagsConfiguration;

  @BeforeEach
  void setUp() {
    clientApiStub.resetAll();
    legacyApiStub.resetAll();

    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);

    fixtureActor = "test-block-list-" + UUID.randomUUID();
    transactionTemplate.executeWithoutResult(
        transaction -> {
          populatedReportingUnitId = insertReportingUnit("BLOCKED");
          emptyReportingUnitId = insertReportingUnit("EMPTY");
          Long blockId =
              jdbcTemplate.queryForObject(
                  """
                  INSERT INTO hrs.block
                      (reporting_unit_id, block_type, created_by, updated_by)
                  VALUES (?, 'DISTRICT_AVERAGE', ?, ?)
                  RETURNING block_id
                  """,
                  Long.class,
                  populatedReportingUnitId,
                  fixtureActor,
                  fixtureActor);
          jdbcTemplate.update(
              """
              INSERT INTO hrs.district_average_block
                  (district_average_block_id, coast_ground_based_area_ha,
                   coast_helicopter_area_ha, has_dispersed_retention, is_heli_logging,
                   created_by, updated_by)
              VALUES (?, 1.250, 0.500, FALSE, FALSE, ?, ?)
              """,
              blockId,
              fixtureActor,
              fixtureActor);
          jdbcTemplate.update(
              """
              INSERT INTO hrs.block_mark
                  (block_id, mark_type, sequence_no, mark, forest_file_id,
                   timber_mark, cutting_permit_id, cut_block_id, created_by, updated_by)
              VALUES (?, 'PRIMARY', 0, 'TM-TEST', 'FILE-TEST', 'TM-TEST',
                      'CP-TEST', 'CUT-TEST', ?, ?)
              """,
              blockId,
              fixtureActor,
              fixtureActor);
          jdbcTemplate.update(
              """
              INSERT INTO hrs.block_submitter
                  (block_id, submitter_id, submitter_name, first_name, last_name,
                   created_by, updated_by)
              VALUES (?, 'test-user', 'Block List Test Submitter', 'Test', 'Submitter', ?, ?)
              """,
              blockId,
              fixtureActor,
              fixtureActor);
          jdbcTemplate.update(
              """
              INSERT INTO hrs.status_event
                  (block_id, status, event_type, created_at, updated_at, created_by, updated_by)
              VALUES (?, 'APP', 'SUBMISSION', NOW() + INTERVAL '1 day',
                      NOW() + INTERVAL '1 day', ?, ?)
              """,
              blockId,
              fixtureActor,
              fixtureActor);
        });
  }

  @AfterEach
  void removeBlockListDatabaseFixtures() {
    transactionTemplate.executeWithoutResult(
        transaction -> {
          jdbcTemplate.update("DELETE FROM hrs.status_event WHERE created_by = ?", fixtureActor);
          jdbcTemplate.update("DELETE FROM hrs.block_submitter WHERE created_by = ?", fixtureActor);
          jdbcTemplate.update("DELETE FROM hrs.block_mark WHERE created_by = ?", fixtureActor);
          jdbcTemplate.update(
              "DELETE FROM hrs.district_average_block WHERE created_by = ?", fixtureActor);
          jdbcTemplate.update("DELETE FROM hrs.block WHERE created_by = ?", fixtureActor);
          jdbcTemplate.update("DELETE FROM hrs.reporting_unit WHERE created_by = ?", fixtureActor);
        });
  }

  private Long insertReportingUnit(String locationCode) {
    return jdbcTemplate.queryForObject(
        """
        INSERT INTO hrs.reporting_unit
            (client_number, client_locn_code, org_unit_no, created_by, updated_by)
        VALUES ('00012797', ?, 'DND', ?, ?)
        RETURNING reporting_unit_id
        """,
        Long.class,
        locationCode,
        fixtureActor,
        fixtureActor);
  }

  @DisplayName("Should Return 201 when Create Succeeds")
  @Test
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void shouldReturn201_whenCreateSucceeds() throws Exception {
    // Legacy search: no existing reporting units
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(
                    ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE)));

    // Forest client exists
    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE)));

    // Legacy create returns new id as numeric JSON
    legacyApiStub.stubFor(post(urlPathEqualTo("/api/reporting-units")).willReturn(okJson("333")));

    var requestJson =
        """
        {"clientNumber":"00012797","districtCode":"DND","samplingCode":"AVG","gradeCode":null}
        """;

    mockMvc
        .perform(
            MockMvcRequestBuilders.post("/api/reporting-units")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
        .andExpect(status().isCreated());
  }

  @Test
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"WASTE_PLUS_SUBMITTER_00012797"})
  @DisplayName("Should allow a submitter to create for the claimed client")
  void shouldAllowSubmitterCreateForMatchingClient() throws Exception {
    stubCreateDependencies();
    assertSuccessfulCreate();
  }

  @Test
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"WASTE_PLUS_SUBMITTER_99999999"})
  @DisplayName("Should deny a submitter creating for a different client")
  void shouldDenySubmitterCreateForCrossClient() throws Exception {
    stubCreateDependencies();

    mockMvc.perform(createReportingUnitRequest()).andExpect(status().isForbidden());

    legacyApiStub.verify(
        0, postRequestedFor(urlPathEqualTo("/api/reporting-units")));
  }

  @Test
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"WASTE_PLUS_ADMIN"})
  @DisplayName("Should allow an admin to create for a different client")
  void shouldAllowAdminCreateForCrossClient() throws Exception {
    String foreignClient = "00099999";
    stubCreateDependencies(foreignClient);

    mockMvc
        .perform(createReportingUnitRequest(foreignClient))
        .andExpect(status().isCreated())
        .andExpect(header().exists("Location"));

    legacyApiStub.verify(
        1,
        postRequestedFor(urlPathEqualTo("/api/reporting-units"))
            .withRequestBody(containing(foreignClient)));
  }

  private void assertSuccessfulCreate() throws Exception {
    mockMvc
        .perform(createReportingUnitRequest())
        .andExpect(status().isCreated())
        .andExpect(header().exists("Location"));

    legacyApiStub.verify(
        1,
        postRequestedFor(urlPathEqualTo("/api/reporting-units"))
            .withRequestBody(containing("00012797")));
  }

  private void stubCreateDependencies() {
    stubCreateDependencies("00012797");
  }

  private void stubCreateDependencies(String clientNumber) {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE)));
    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/" + clientNumber))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE)));
    legacyApiStub.stubFor(post(urlPathEqualTo("/api/reporting-units")).willReturn(okJson("333")));
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder createReportingUnitRequest() {
    return createReportingUnitRequest("00012797");
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder createReportingUnitRequest(
      String clientNumber) {
    return MockMvcRequestBuilders.post("/api/reporting-units")
        .with(SecurityMockMvcRequestPostProcessors.csrf())
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            "{\"clientNumber\":\"" + clientNumber + "\",\"districtCode\":\"DND\","
                + "\"samplingCode\":\"AVG\",\"gradeCode\":null}");
  }

  @DisplayName("Should Return 400 when Grade Missing For DKM")
  @Test
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void shouldReturn400_whenGradeMissingForDkm() throws Exception {
    // Legacy search: no existing reporting units
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(
                    ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE)));

    var requestJson =
        """
        {"clientNumber":"00012797","districtCode":"DKM","samplingCode":"AVG"}
        """;

    mockMvc
        .perform(
            MockMvcRequestBuilders.post("/api/reporting-units")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
        .andExpect(status().isBadRequest());
  }

  @DisplayName("Should Return 409 when Reporting Unit Duplicate")
  @Test
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void shouldReturn409_whenReportingUnitDuplicate() throws Exception {
    // Legacy search: returns an existing RU (totalElements > 0)
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    var requestJson =
        """
        {"clientNumber":"00012797","districtCode":"DND","samplingCode":"AVG","gradeCode":null}
        """;

    mockMvc
        .perform(
            MockMvcRequestBuilders.post("/api/reporting-units")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
        .andExpect(status().isConflict());
  }

  @Test
  @WithMockJwt
  @DisplayName("Should Return 404 for an Unknown Legacy Reporting Unit Block List")
  void shouldReturn404_whenBlockListReportingUnitDoesNotExist() throws Exception {
    mockMvc
        .perform(
            MockMvcRequestBuilders.get("/api/reporting-units/{id}/blocks", 999999999L)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());

    legacyApiStub.verify(1, getRequestedFor(urlPathEqualTo("/api/reporting-units/999999999")));
    legacyApiStub.verify(
        0, getRequestedFor(urlPathEqualTo("/api/reporting-units/999999999/blocks")));
  }

  @Test
  @WithMockJwt
  @DisplayName("Should Return Postgres Block Rows with Aggregates and Latest Status")
  void shouldReturnPostgresBlocks_whenReportingUnitHasBlocks() throws Exception {
    mockMvc
        .perform(
            MockMvcRequestBuilders.get(
                    "/api/reporting-units/{id}/blocks", populatedReportingUnitId)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()").value(1))
        .andExpect(jsonPath("$.content[0].licenseNumber").value("FILE-TEST"))
        .andExpect(jsonPath("$.content[0].cuttingPermit").value("CP-TEST"))
        .andExpect(jsonPath("$.content[0].cutBlockId").value("CUT-TEST"))
        .andExpect(jsonPath("$.content[0].timberMark").value("TM-TEST"))
        .andExpect(jsonPath("$.content[0].totalWasteAreaHa").value(1.75))
        .andExpect(jsonPath("$.content[0].submitter").value("Block List Test Submitter"))
        .andExpect(jsonPath("$.content[0].status.code").value("APP"))
        .andExpect(jsonPath("$.content[0].status.description").value("Approved"));

    var response =
        mockMvc
            .perform(
                MockMvcRequestBuilders.get(
                        "/api/reporting-units/{id}/blocks", populatedReportingUnitId)
                    .accept(MediaType.APPLICATION_JSON))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(jsonMapper.readTree(response).get("content").get(0).get("totalWasteVolumeM3").isNull())
        .isTrue();
  }

  @Test
  @WithMockJwt
  @DisplayName("Should Return Empty Blocks Page for Postgres Reporting Unit Without Blocks")
  void shouldReturnEmptyPage_whenPostgresReportingUnitHasNoBlocks() throws Exception {
    mockMvc
        .perform(
                MockMvcRequestBuilders.get(
                    "/api/reporting-units/{id}/blocks", emptyReportingUnitId)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.content").isEmpty())
        .andExpect(jsonPath("$.page.totalElements").value(0))
        .andExpect(jsonPath("$.page.size").value(10));
  }

  @Test
  @WithMockJwt
  @DisplayName("Should Return Reporting Unit Details when Both APIs Succeed")
  void shouldReturnReportingUnitDetails_whenBothApisSucceed() throws Exception {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/12345"))
            .willReturn(
                okJson(
                    """
                    {
                      "clientNumber": "00012797",
                      "clientLocnCode": "00",
                      "sampling": {"code": "AVG", "description": "Average"},
                      "district": {"code": "DND", "description": "Nadina Natural Resource District"}
                    }
                    """)));

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE)));

    mockMvc
        .perform(
            MockMvcRequestBuilders.get("/api/reporting-units/{id}", 12345L)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.id").value(12345))
        .andExpect(jsonPath("$.client.code").value("00012797"))
        .andExpect(jsonPath("$.client.description").value("MINISTRY OF FORESTS"))
        .andExpect(jsonPath("$.clientStatus.code").value("ACT"))
        .andExpect(jsonPath("$.sampling.code").value("AVG"))
        .andExpect(jsonPath("$.district.code").value("DND"))
        .andExpect(jsonPath("$.blockRule.maxBlocks").value(1))
        .andExpect(jsonPath("$.blockRule.blockType").value("DISTRICT_AVERAGE"))
        .andExpect(jsonPath("$.isLegacy").value(true));
  }

  @Test
  @WithMockJwt
  @DisplayName("Should Return 404 when Forest Client Not Found")
  void shouldReturn404_whenForestClientNotFound() throws Exception {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/12345")).willReturn(okJson(LEGACY_RU_DETAILS)));

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797")).willReturn(notFound()));

    mockMvc
        .perform(
            MockMvcRequestBuilders.get("/api/reporting-units/{id}", 12345L)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  @WithMockJwt
  @DisplayName("Should Return 404 when Reporting Unit Details Feature Flag Is Disabled")
  void shouldReturn404_whenReportingUnitDetailsFeatureFlagIsDisabled() throws Exception {
    doReturn(false)
        .when(featureFlagsConfiguration)
        .isEnabled(FeatureFlag.REPORTING_UNIT_DETAILS_ENABLED);

    mockMvc
        .perform(
            MockMvcRequestBuilders.get("/api/reporting-units/{id}", 12345L)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  @WithMockJwt
  @DisplayName("Should Keep Block List Available when Reporting Unit Details Flag Is Disabled")
  void shouldReturnBlocks_whenReportingUnitDetailsFeatureFlagIsDisabled() throws Exception {
    doReturn(false)
        .when(featureFlagsConfiguration)
        .isEnabled(FeatureFlag.REPORTING_UNIT_DETAILS_ENABLED);

    mockMvc
        .perform(
            MockMvcRequestBuilders.get(
                    "/api/reporting-units/{id}/blocks", populatedReportingUnitId)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").isNumber());
  }

  @Test
  @DisplayName("Should Require Authentication for Block List")
  void shouldRequireAuthentication_whenBlockListRequestedAnonymously() throws Exception {
    mockMvc
        .perform(
            MockMvcRequestBuilders.get(
                    "/api/reporting-units/{id}/blocks", populatedReportingUnitId)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"WASTE_PLUS_VIEWER_00012797"})
  @DisplayName("Should Return 200 when Bceid User Has Matching Client Role")
  void shouldReturn200_whenBceidUserHasMatchingClientRole() throws Exception {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/12345")).willReturn(okJson(LEGACY_RU_DETAILS)));

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE)));

    mockMvc
        .perform(
            MockMvcRequestBuilders.get("/api/reporting-units/{id}", 12345L)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.id").value(12345))
        .andExpect(jsonPath("$.client.code").value("00012797"));
  }

  @Test
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"WASTE_PLUS_SUBMITTER_99999999"})
  @DisplayName("Should Return 403 when Bceid User Has No Matching Client Role")
  void shouldReturn403_whenBceidUserHasNoMatchingClientRole() throws Exception {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/12345")).willReturn(okJson(LEGACY_RU_DETAILS)));

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE)));

    mockMvc
        .perform(
            MockMvcRequestBuilders.get("/api/reporting-units/{id}", 12345L)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden());
  }
}

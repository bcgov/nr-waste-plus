package ca.bc.gov.nrs.hrs.controller;

import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.notFound;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.mockito.Mockito.doReturn;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.support.TransactionTemplate;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Block Controller")
class BlockControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  private static final String ACTOR = "ctrl-test";
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private static final String LEGACY_BLOCK_LIST =
      """
      [
        {
          "id": 777,
          "licenseNumber": "FILE-LEG",
          "cuttingPermit": "CP-LEG",
          "cutBlockId": "CUT-LEG",
          "timberMark": "TM-LEG",
          "totalWasteAreaHa": 1.5,
          "totalWasteVolumeM3": null,
          "submitter": "Legacy Submitter",
          "status": {"code": "DFT", "description": "Draft"},
          "lastUpdated": null
        }
      ]""";

  private static final String LEGACY_BLOCK_LIST_NULL_ID =
      """
      [
        {
          "id": null,
          "licenseNumber": "FILE-NULL",
          "status": {"code": "DFT", "description": "Draft"}
        }
      ]""";

  private static final String LEGACY_BLOCK_LIST_NO_STATUS =
      """
      [
        {
          "id": 777,
          "licenseNumber": "FILE-NOSTATUS",
          "status": null
        }
      ]""";

  private static final String LEGACY_BLOCK_LIST_FINAL_STATUS =
      """
      [
        {
          "id": 777,
          "licenseNumber": "FILE-APPR",
          "status": {"code": "APPR", "description": "Approved"}
        }
      ]""";

  private static final String LEGACY_RU_DETAILS =
      """
      {
        "clientNumber": "00012797",
        "clientLocnCode": "00",
        "sampling": {"code": "AVG", "description": "Average"},
        "district": {"code": "DND", "description": "Nadina Natural Resource District"}
      }""";

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
  private ReportingUnitRepository reportingUnitRepository;
  @Autowired
  private BlockRepository blockRepository;
  @Autowired
  private BlockCalculationSnapshotRepository snapshotRepository;
  @Autowired
  private JdbcTemplate jdbcTemplate;
  @Autowired
  private TransactionTemplate transactionTemplate;
  @Autowired
  private CircuitBreakerRegistry circuitBreakerRegistry;
  @Autowired
  private RetryRegistry retryRegistry;

  @MockitoSpyBean
  private FeatureFlagsConfiguration featureFlagsConfiguration;

  private Long blockId;
  private Long reportingUnitId;
  private Long otherReportingUnitId;
  private Long foreignBlockId;
  private Long foreignReportingUnitId;
  private Long districtVolumeId;

  @BeforeEach
  void resetStubsAndBreakers() {
    legacyApiStub.resetAll();

    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);
  }

  @BeforeEach
  void setUp() {
    String unique = UUID.randomUUID().toString().substring(0, 8);

    ReportingUnitEntity ru = new ReportingUnitEntity();
    ru.setClientNumber("00000000");
    ru.setClientLocnCode("CTRL-" + unique);
    ru.setOrgUnitNo("DCC");
    audit(ru);
    ReportingUnitEntity savedRu = reportingUnitRepository.saveAndFlush(ru);
    reportingUnitId = savedRu.getId();

    ReportingUnitEntity otherRu = new ReportingUnitEntity();
    otherRu.setClientNumber("00000000");
    otherRu.setClientLocnCode("OTHER-" + unique);
    otherRu.setOrgUnitNo("DCC");
    audit(otherRu);
    otherReportingUnitId = reportingUnitRepository.saveAndFlush(otherRu).getId();

    BlockEntity block = new BlockEntity();
    block.setReportingUnitId(savedRu.getId());
    block.setBlockType("DISTRICT_AVERAGE");
    block.setDraft(true);
    block.setPlcDate(LocalDate.of(2026, Month.JANUARY, 15));
    block.setRevision(0L);
    audit(block);
    BlockEntity savedBlock = blockRepository.saveAndFlush(block);
    blockId = savedBlock.getId();

    ReportingUnitEntity foreignRu = new ReportingUnitEntity();
    foreignRu.setClientNumber("99999999");
    foreignRu.setClientLocnCode("FOREIGN-" + unique);
    foreignRu.setOrgUnitNo("DCC");
    audit(foreignRu);
    ReportingUnitEntity savedForeignRu = reportingUnitRepository.saveAndFlush(foreignRu);
    foreignReportingUnitId = savedForeignRu.getId();

    BlockEntity foreignBlock = new BlockEntity();
    foreignBlock.setReportingUnitId(foreignReportingUnitId);
    foreignBlock.setBlockType("DISTRICT_AVERAGE");
    foreignBlock.setDraft(false);
    foreignBlock.setPlcDate(LocalDate.of(2025, Month.JUNE, 1));
    audit(foreignBlock);
    foreignBlockId = blockRepository.saveAndFlush(foreignBlock).getId();

    districtVolumeId =
        jdbcTemplate.queryForObject(
            "SELECT district_volume_id FROM hrs.district_volume ORDER BY district_volume_id LIMIT"
                + " 1",
            Long.class);
  }

  @AfterEach
  void cleanUpSnapshots() {
    jdbcTemplate.update("DELETE FROM hrs.block_calculation_snapshot WHERE block_id = ?", blockId);
    jdbcTemplate.update(
        "DELETE FROM hrs.block_calculation_snapshot WHERE block_id = ?", foreignBlockId);
  }

  // ---------------------------------------------------------------------
  // GET /{reportingUnitId}/{blockId} — block details
  // ---------------------------------------------------------------------

  @Test
  @DisplayName("Returns 404 when block details feature flag is disabled")
  @WithMockJwt
  void returns404WhenBlockDetailsFlagDisabled() throws Exception {
    doReturn(false)
        .when(featureFlagsConfiguration)
        .isEnabled(FeatureFlag.REPORTING_UNIT_BLOCK_DETAILS_ENABLED);

    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(reportingUnitId, blockId)))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Returns postgres block details with isLegacy false")
  @WithMockJwt
  void returnsPostgresBlockDetailsWithIsLegacyFalse() throws Exception {
    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(reportingUnitId, blockId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(blockId))
        .andExpect(jsonPath("$.reportingUnitId").value(reportingUnitId))
        .andExpect(jsonPath("$.blockType").value("DISTRICT_AVERAGE"))
        .andExpect(jsonPath("$.draft").value(true))
        .andExpect(jsonPath("$.plcDate").value("2026-01-15"))
        .andExpect(jsonPath("$.revision").value(0))
        .andExpect(jsonPath("$.isLegacy").value(false));
  }

  @Test
  @DisplayName("Returns legacy block details with isLegacy true")
  @WithMockJwt
  void returnsLegacyBlockDetailsWithIsLegacyTrue() throws Exception {
    Long legacyReportingUnitId = 555L;
    Long legacyBlockId = 777L;

    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/" + legacyReportingUnitId))
            .willReturn(okJson(LEGACY_RU_DETAILS)));
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/" + legacyReportingUnitId + "/blocks"))
            .willReturn(okJson(LEGACY_BLOCK_LIST)));

    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(legacyReportingUnitId, legacyBlockId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(legacyBlockId))
        .andExpect(jsonPath("$.reportingUnitId").value(legacyReportingUnitId))
        .andExpect(jsonPath("$.blockType").isEmpty())
        .andExpect(jsonPath("$.draft").value(true))
        .andExpect(jsonPath("$.plcDate").isEmpty())
        .andExpect(jsonPath("$.revision").isEmpty())
        .andExpect(jsonPath("$.isLegacy").value(true));
  }

  @Test
  @DisplayName("Returns 404 when the legacy block list has no row matching the block id")
  @WithMockJwt
  void returns404WhenLegacyBlockListHasNoMatchingId() throws Exception {
    Long legacyReportingUnitId = 556L;

    stubLegacyReportingUnit(legacyReportingUnitId, LEGACY_BLOCK_LIST);

    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(legacyReportingUnitId, 888L)))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Returns 404 when every legacy block row has a null id")
  @WithMockJwt
  void returns404WhenLegacyBlockRowsHaveNullId() throws Exception {
    Long legacyReportingUnitId = 557L;

    stubLegacyReportingUnit(legacyReportingUnitId, LEGACY_BLOCK_LIST_NULL_ID);

    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(legacyReportingUnitId, 777L)))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Maps a legacy block with a missing status to draft false")
  @WithMockJwt
  void mapsLegacyBlockWithNullStatusToDraftFalse() throws Exception {
    Long legacyReportingUnitId = 558L;

    stubLegacyReportingUnit(legacyReportingUnitId, LEGACY_BLOCK_LIST_NO_STATUS);

    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(legacyReportingUnitId, 777L)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(777))
        .andExpect(jsonPath("$.draft").value(false))
        .andExpect(jsonPath("$.isLegacy").value(true));
  }

  @Test
  @DisplayName("Maps a legacy block with a non-draft status to draft false")
  @WithMockJwt
  void mapsLegacyBlockWithNonDraftStatusToDraftFalse() throws Exception {
    Long legacyReportingUnitId = 559L;

    stubLegacyReportingUnit(legacyReportingUnitId, LEGACY_BLOCK_LIST_FINAL_STATUS);

    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(legacyReportingUnitId, 777L)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(777))
        .andExpect(jsonPath("$.draft").value(false))
        .andExpect(jsonPath("$.isLegacy").value(true));
  }

  @Test
  @DisplayName("Returns 404 when block is not found in postgres")
  @WithMockJwt
  void returns404WhenBlockNotFoundInPostgres() throws Exception {
    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(reportingUnitId, 999999L)))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Returns 404 when reporting unit is not found")
  @WithMockJwt
  void returns404WhenReportingUnitNotFound() throws Exception {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/999999999")).willReturn(notFound()));

    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(999999999L, 1L)))
        .andExpect(status().isNotFound());

    legacyApiStub.verify(
        0, getRequestedFor(urlPathEqualTo("/api/reporting-units/999999999/blocks")));
  }

  @Test
  @DisplayName("Denies a BCeID caller reading another client's block details")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"WASTE_PLUS_VIEWER_00000000"})
  void deniesBceidCrossClientBlockDetails() throws Exception {
    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(foreignReportingUnitId, foreignBlockId)))
        .andExpect(status().isForbidden())
        .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("DISTRICT_AVERAGE"))));
  }

  @Test
  @DisplayName("Allows a BCeID caller with the matching client role")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"WASTE_PLUS_VIEWER_00000000"})
  void allowsBceidSameClientBlockDetails() throws Exception {
    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(reportingUnitId, blockId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(blockId))
        .andExpect(jsonPath("$.isLegacy").value(false));
  }

  @Test
  @DisplayName("Allows a BCeID caller holding only the SUBMITTER role for the owning client")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"WASTE_PLUS_SUBMITTER_00000000"})
  void allowsBceidSubmitterBlockDetails() throws Exception {
    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(reportingUnitId, blockId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(blockId))
        .andExpect(jsonPath("$.isLegacy").value(false));
  }

  @Test
  @DisplayName("Keeps IDIR unrestricted on block details for a foreign reporting unit")
  @WithMockJwt(idp = "idir")
  void allowsIdirBlockDetailsForForeignReportingUnit() throws Exception {
    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(foreignReportingUnitId, foreignBlockId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(foreignBlockId))
        .andExpect(jsonPath("$.reportingUnitId").value(foreignReportingUnitId));
  }

  @Test
  @DisplayName("Returns 401 for unauthenticated block details request")
  void returns401ForUnauthenticatedDetails() throws Exception {
    mockMvc.perform(MockMvcRequestBuilders.get(detailsUrl(reportingUnitId, blockId))).andExpect(status().isUnauthorized());
  }

  // ---------------------------------------------------------------------
  // GET /{reportingUnitId}/blocks — moved list endpoint (literal wins)
  // ---------------------------------------------------------------------

  @Test
  @DisplayName("Routes the literal /blocks path to the list handler, not the details handler")
  @WithMockJwt
  void routesBlocksLiteralToListHandler() throws Exception {
    mockMvc
        .perform(
            MockMvcRequestBuilders.get("/api/reporting-units/{id}/blocks", reportingUnitId)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.page").exists())
        .andExpect(jsonPath("$.page.size").value(10));

    mockMvc
        .perform(MockMvcRequestBuilders.get(detailsUrl(reportingUnitId, blockId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(blockId))
        .andExpect(jsonPath("$.content").doesNotExist());
  }

  // ---------------------------------------------------------------------
  // GET /{reportingUnitId}/{blockId}/calculation — moved into BlockController
  // ---------------------------------------------------------------------

  @Test
  @DisplayName("Returns 200 with latest snapshot when one exists")
  @WithMockJwt
  void returnsOkWithLatestSnapshot() throws Exception {
    Instant t1 = Instant.parse("2025-07-01T08:00:00Z");
    Instant t2 = Instant.parse("2025-07-01T12:00:00Z");

    snapshotRepository.save(
        new BlockCalculationSnapshotEntity(
            blockId,
            districtVolumeId,
            null,
            null,
            MAPPER.readTree("{\"da.x\":1}"),
            MAPPER.readTree("{\"da.mature.volume\":10.500,\"da.total\":20.000}"),
            t1,
            "HALF_UP",
            MAPPER.createArrayNode(),
            ACTOR,
            ACTOR,
            t1,
            t1));

    snapshotRepository.save(
        new BlockCalculationSnapshotEntity(
            blockId,
            districtVolumeId,
            null,
            null,
            MAPPER.readTree("{\"da.x\":2}"),
            MAPPER.readTree("{\"da.mature.volume\":15.750,\"da.total\":30.000}"),
            t2,
            "HALF_UP",
            MAPPER.createArrayNode(),
            ACTOR,
            ACTOR,
            t2,
            t2));

    mockMvc
        .perform(MockMvcRequestBuilders.get(calculationUrl(reportingUnitId, blockId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.blockId").value(blockId))
        .andExpect(jsonPath("$.districtVolumeId").value(districtVolumeId))
        .andExpect(jsonPath("$.roundingPolicy").value("HALF_UP"))
        .andExpect(
            jsonPath("$.outputs.grandTotalM3").value(new BigDecimal("45.750").doubleValue()))
        .andExpect(jsonPath("$.outputs.perMark").isArray())
        .andExpect(jsonPath("$.outputs.perMark").isEmpty())
        .andExpect(jsonPath("$.warnings").isArray())
        .andExpect(jsonPath("$.warnings").isEmpty());
  }

  @Test
  @DisplayName("Returns 404 when no snapshot exists for block")
  @WithMockJwt
  void returns404WhenNoSnapshot() throws Exception {
    mockMvc
        .perform(MockMvcRequestBuilders.get(calculationUrl(reportingUnitId, blockId)))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Returns 404 for non-existent block id")
  @WithMockJwt
  void returns404ForNonExistentBlock() throws Exception {
    mockMvc.perform(MockMvcRequestBuilders.get(calculationUrl(reportingUnitId, 999999L))).andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Returns the snapshot through the reporting-unit-scoped calculation URL")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"WASTE_PLUS_VIEWER_00000000"})
  void returnsSnapshotThroughReportingUnitScopedUrl() throws Exception {
    String marker = "SAME_SCOPE_CALCULATION";
    snapshotRepository.save(
        new BlockCalculationSnapshotEntity(
            blockId,
            districtVolumeId,
            null,
            null,
            MAPPER.readTree("{}"),
            MAPPER.readTree("{\"marker\":1}"),
            Instant.parse("2025-07-01T12:00:00Z"),
            marker,
            MAPPER.createArrayNode(),
            ACTOR,
            ACTOR,
            Instant.parse("2025-07-01T12:00:00Z"),
            Instant.parse("2025-07-01T12:00:00Z")));

    mockMvc
        .perform(MockMvcRequestBuilders.get(calculationUrl(reportingUnitId, blockId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roundingPolicy").value(marker));
  }

  @Test
  @DisplayName("Denies a BCeID caller reading another client's calculation snapshot")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"WASTE_PLUS_VIEWER_00000000"})
  void deniesCrossClientCalculationSnapshotWithoutForeignMarker() throws Exception {
    String marker = "FOREIGN_CLIENT_CALCULATION";
    snapshotRepository.save(
        new BlockCalculationSnapshotEntity(
            foreignBlockId,
            districtVolumeId,
            null,
            null,
            MAPPER.readTree("{}"),
            MAPPER.readTree("{\"marker\":1}"),
            Instant.parse("2025-07-01T12:00:00Z"),
            marker,
            MAPPER.createArrayNode(),
            ACTOR,
            ACTOR,
            Instant.parse("2025-07-01T12:00:00Z"),
            Instant.parse("2025-07-01T12:00:00Z")));

    mockMvc
        .perform(MockMvcRequestBuilders.get(calculationUrl(foreignReportingUnitId, foreignBlockId)))
        .andExpect(status().isForbidden())
        .andExpect(
            content()
                .string(
                    org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(marker))));
  }

  @Test
  @DisplayName("Keeps IDIR unrestricted on the reporting-unit-scoped calculation URL")
  @WithMockJwt(idp = "idir")
  void allowsIdirCalculationSnapshotRead() throws Exception {
    snapshotRepository.save(
        new BlockCalculationSnapshotEntity(
            foreignBlockId,
            districtVolumeId,
            null,
            null,
            MAPPER.readTree("{}"),
            MAPPER.readTree("{\"marker\":1}"),
            Instant.parse("2025-07-01T12:00:00Z"),
            "IDIR_CONTROL",
            MAPPER.createArrayNode(),
            ACTOR,
            ACTOR,
            Instant.parse("2025-07-01T12:00:00Z"),
            Instant.parse("2025-07-01T12:00:00Z")));

    mockMvc
        .perform(MockMvcRequestBuilders.get(calculationUrl(foreignReportingUnitId, foreignBlockId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roundingPolicy").value("IDIR_CONTROL"));
  }

  @Test
  @DisplayName("Rejects a calculation request with the wrong parent reporting unit")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"WASTE_PLUS_VIEWER_00000000"})
  void rejectsWrongParentReportingUnit() throws Exception {
    mockMvc
        .perform(MockMvcRequestBuilders.get(calculationUrl(otherReportingUnitId, blockId)))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Denies a foreign parent reporting unit before probing the block")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"WASTE_PLUS_VIEWER_00000000"})
  void forbidsForeignParentBeforeBlockProbe() throws Exception {
    mockMvc
        .perform(MockMvcRequestBuilders.get(calculationUrl(foreignReportingUnitId, blockId)))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Returns 401 for unauthenticated calculation request")
  void returns401ForUnauthenticatedCalculation() throws Exception {
    mockMvc
        .perform(MockMvcRequestBuilders.get(calculationUrl(reportingUnitId, blockId)))
        .andExpect(status().isUnauthorized());
  }

  private String detailsUrl(Long parentReportingUnitId, Long childBlockId) {
    return "/api/reporting-units/" + parentReportingUnitId + "/" + childBlockId;
  }

  private void stubLegacyReportingUnit(Long legacyReportingUnitId, String blockListJson) {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/" + legacyReportingUnitId))
            .willReturn(okJson(LEGACY_RU_DETAILS)));
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/" + legacyReportingUnitId + "/blocks"))
            .willReturn(okJson(blockListJson)));
  }

  private String calculationUrl(Long parentReportingUnitId, Long childBlockId) {
    return "/api/reporting-units/" + parentReportingUnitId + "/" + childBlockId + "/calculation";
  }

  private void audit(ReportingUnitEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(Instant.parse("2025-07-01T00:00:00Z"));
    entity.setUpdatedAt(Instant.parse("2025-07-01T00:00:00Z"));
  }

  private void audit(BlockEntity entity) {
    entity.setCreatedBy(ACTOR);
    entity.setUpdatedBy(ACTOR);
    entity.setCreatedAt(Instant.parse("2025-07-01T00:00:00Z"));
    entity.setUpdatedAt(Instant.parse("2025-07-01T00:00:00Z"));
  }
}

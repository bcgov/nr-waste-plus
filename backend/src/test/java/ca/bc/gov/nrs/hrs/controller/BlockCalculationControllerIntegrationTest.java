package ca.bc.gov.nrs.hrs.controller;

import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Block Calculation Controller")
class BlockCalculationControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  private static final String ACTOR = "ctrl-test";
  private static final ObjectMapper MAPPER = new ObjectMapper();

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

  private Long blockId;
  private Long reportingUnitId;
  private Long otherReportingUnitId;
  private Long foreignBlockId;
  private Long foreignReportingUnitId;
  private Long districtVolumeId;

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
    block.setDraft(false);
    block.setPlcDate(LocalDate.of(2025, Month.JUNE, 1));
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
         .perform(get(calculationUrl(reportingUnitId, blockId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.blockId").value(blockId))
        .andExpect(jsonPath("$.districtVolumeId").value(districtVolumeId))
        .andExpect(jsonPath("$.roundingPolicy").value("HALF_UP"))
        .andExpect(jsonPath("$.outputs.grandTotalM3").value(new BigDecimal("45.750").doubleValue()))
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
         .perform(get(calculationUrl(reportingUnitId, blockId)))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Returns 404 for non-existent block id")
  @WithMockJwt
  void returns404ForNonExistentBlock() throws Exception {
    mockMvc.perform(get(calculationUrl(reportingUnitId, 999999L))).andExpect(status().isNotFound());
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
        .perform(get("/api/reporting-units/" + reportingUnitId + "/blocks/" + blockId + "/calculation"))
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
        .perform(
            get(
                "/api/reporting-units/" + foreignReportingUnitId + "/blocks/" + foreignBlockId
                    + "/calculation"))
        .andExpect(status().isForbidden())
        .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(marker))));
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
        .perform(
            get(
                "/api/reporting-units/" + foreignReportingUnitId + "/blocks/" + foreignBlockId
                    + "/calculation"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roundingPolicy").value("IDIR_CONTROL"));
  }

  @Test
  @DisplayName("Rejects a calculation request with the wrong parent reporting unit")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"WASTE_PLUS_VIEWER_00000000"})
  void rejectsWrongParentReportingUnit() throws Exception {
    mockMvc
        .perform(get("/api/reporting-units/" + otherReportingUnitId + "/blocks/" + blockId + "/calculation"))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Denies a foreign parent reporting unit before probing the block")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"WASTE_PLUS_VIEWER_00000000"})
  void forbidsForeignParentBeforeBlockProbe() throws Exception {
    mockMvc
        .perform(get("/api/reporting-units/" + foreignReportingUnitId + "/blocks/" + blockId + "/calculation"))
        .andExpect(status().isForbidden());
  }

   @Test
   @DisplayName("Returns 401 for unauthenticated request")
   void returns401ForUnauthenticated() throws Exception {
     mockMvc
         .perform(get(calculationUrl(reportingUnitId, blockId)))
         .andExpect(status().isUnauthorized());
   }

  private String calculationUrl(Long parentReportingUnitId, Long childBlockId) {
    return "/api/reporting-units/"
        + parentReportingUnitId
        + "/blocks/"
        + childBlockId
        + "/calculation";
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

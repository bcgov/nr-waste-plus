package ca.bc.gov.nrs.hrs.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.support.TransactionTemplate;

@AutoConfigureMockMvc
@DisplayName("Integrated Test | Reporting Unit Details Endpoint")
@WithMockJwt
class ReportingUnitControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ReportingUnitRepository reportingUnitRepository;

  @Autowired
  private TransactionTemplate transactionTemplate;

  private Long createdReportingUnitId;

  @AfterEach
  void removeCreatedReportingUnit() {
    if (createdReportingUnitId != null) {
      transactionTemplate.executeWithoutResult(
          status -> reportingUnitRepository.deleteById(createdReportingUnitId));
      createdReportingUnitId = null;
    }
  }

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

  @Test
  @DisplayName("should return 404 for a block list when the reporting unit does not exist")
  void shouldReturn404_whenBlockListReportingUnitNotFound() throws Exception {
    mockMvc
        .perform(
            get("/api/reporting-units/{id}/blocks", 999999999)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("shouldReturnBlockRows_whenReportingUnitHasLegacyBlocks")
  void shouldReturnBlockRows_whenReportingUnitHasLegacyBlocks() throws Exception {
    mockMvc
        .perform(
            get("/api/reporting-units/{id}/blocks", 879)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$[0].id").value(1905))
        .andExpect(jsonPath("$[0].licenseNumber").value("R21110"))
        .andExpect(jsonPath("$[0].cutBlockId").value(""))
        .andExpect(jsonPath("$[0].status.code").value("DFT"))
        .andExpect(jsonPath("$[0].status.description").value("Draft"))
        .andExpect(jsonPath("$[1].id").value(1906))
        .andExpect(jsonPath("$[1].licenseNumber").value("A74531"))
        .andExpect(jsonPath("$[1].totalWasteAreaHa").value(27.02))
        .andExpect(jsonPath("$[1].cuttingPermit").value("9"))
        .andExpect(jsonPath("$[1].timberMark").value("JY1009"))
        .andExpect(jsonPath("$[1].cutBlockId").value("CB1"))
        .andExpect(jsonPath("$[1].totalWasteVolumeM3").doesNotExist())
        .andExpect(jsonPath("$[1].status.code").value("RTB"));
  }

  @Test
  @DisplayName("should create a reporting unit and return its persisted ID")
  void shouldCreateReportingUnit_whenRequestIsValid() throws Exception {
    MvcResult response = mockMvc
        .perform(
            post("/api/reporting-units")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "clientNumber": "00001271",
                      "districtCode": "DKM",
                      "samplingCode": "AGR"
                    }
                    """))
        .andExpect(status().isCreated())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andReturn();

    createdReportingUnitId = Long.valueOf(response.getResponse().getContentAsString());

    assertThat(createdReportingUnitId).isPositive();
    var createdReportingUnit = reportingUnitRepository.findById(createdReportingUnitId);
    assertThat(createdReportingUnit).isPresent();
    assertThat(createdReportingUnit.orElseThrow().getOrgUnitNo()).isEqualTo(32L);
    assertThat(createdReportingUnit.orElseThrow().getClientNumber()).isEqualTo("00001271");
    assertThat(createdReportingUnit.orElseThrow().getClientLocationCode()).isEqualTo("00");
    assertThat(createdReportingUnit.orElseThrow().getWasteSamplingOptionCode()).isEqualTo("AGR");
    assertThat(createdReportingUnit.orElseThrow().getCreatedBy()).isEqualTo("IDIR\\test");
    assertThat(createdReportingUnit.orElseThrow().getUpdatedBy()).isEqualTo("IDIR\\test");
    assertThat(createdReportingUnit.orElseThrow().getRevision()).isEqualTo(1L);
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

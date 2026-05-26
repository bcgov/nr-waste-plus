package ca.bc.gov.nrs.hrs.controller;

import static ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE;
import static ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE;
import static ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Reporting Unit Controller - Create")
class ReportingUnitControllerTest extends AbstractTestContainerIntegrationTest {

  @RegisterExtension
  static WireMockExtension clientApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .port(10000)
          )
          .configureStaticDsl(true)
          .build();

  @RegisterExtension
  static WireMockExtension legacyApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .port(10001)
          )
          .configureStaticDsl(true)
          .build();

  @Autowired
  private MockMvc mockMvc;

  @Test
  @WithMockJwt
  @DisplayName("shouldReturn201_whenCreateSucceeds")
  void shouldReturn201_whenCreateSucceeds() throws Exception {
    // Legacy search: no existing reporting units
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(okJson(REPORTING_UNITS_EMPTY_SEARCH_RESPONSE)));

    // Forest client exists
    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(okJson(CLIENTNUMBER_RESPONSE)));

    // Legacy create returns new id as numeric JSON
    legacyApiStub.stubFor(
        post(urlPathEqualTo("/api/reporting-units"))
            .willReturn(okJson("333")));

    var requestJson = """
        {"clientNumber":"00012797","districtCode":"DND","samplingCode":"S01","gradeCode":null}
        """;

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .post("/api/reporting-units")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson)
        )
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(333));
  }

  @Test
  @WithMockJwt
  @DisplayName("shouldReturn400_whenGradeMissingForDKM")
  void shouldReturn400_whenGradeMissingForDKM() throws Exception {
    // Legacy search: no existing reporting units
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(okJson(REPORTING_UNITS_EMPTY_SEARCH_RESPONSE)));

    var requestJson = """
        {"clientNumber":"00012797","districtCode":"DKM","samplingCode":"S01"}
        """;

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .post("/api/reporting-units")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson)
        )
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockJwt
  @DisplayName("shouldReturn409_whenReportingUnitDuplicate")
  void shouldReturn409_whenReportingUnitDuplicate() throws Exception {
    // Legacy search: returns an existing RU (totalElements > 0)
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(okJson(REPORTING_UNITS_SEARCH_RESPONSE)));

    var requestJson = """
        {"clientNumber":"00012797","districtCode":"DND","samplingCode":"S01","gradeCode":null}
        """;

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .post("/api/reporting-units")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson)
        )
        .andExpect(status().isConflict());
  }

}

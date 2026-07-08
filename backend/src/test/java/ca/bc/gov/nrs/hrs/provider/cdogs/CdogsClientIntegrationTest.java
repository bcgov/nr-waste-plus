package ca.bc.gov.nrs.hrs.provider.cdogs;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestClientResponseException;

@DisplayName("Integrated Test | CdogsClient")
class CdogsClientIntegrationTest extends AbstractTestContainerIntegrationTest {

  @RegisterExtension
  static WireMockExtension cdogsApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .dynamicPort()
                  .notifier(new WiremockLogNotifier())
                  .asynchronousResponseEnabled(true)
                  .stubRequestLoggingDisabled(false))
          .configureStaticDsl(true)
          .build();

  @DynamicPropertySource
  static void overrideCdogsUri(DynamicPropertyRegistry registry) {
    registry.add(
        "ca.bc.gov.nrs.cdogs.uri",
        () -> "http://localhost:" + cdogsApiStub.getPort());
  }

  @MockitoBean
  private CdogsTokenService tokenService;

  @Autowired
  private CdogsClient cdogsClient;

  @BeforeEach
  void setUp() {
    cdogsApiStub.resetAll();
    when(tokenService.getAccessToken()).thenReturn("mock-access-token");
  }

  @Test
  @DisplayName("renderDocument posts to /template/render and returns rendered file")
  void renderDocument_shouldReturnRenderedFile() {
    // Arrange
    cdogsApiStub.stubFor(
        post(urlPathEqualTo("/template/render"))
            .willReturn(
                aResponse()
                    .withStatus(200)
                    .withHeader(
                        "Content-Type",
                        "application/vnd.openxmlformats-officedocument"
                            + ".wordprocessingml.document")
                    .withHeader(
                        "Content-Disposition",
                        "attachment; filename=\"generated_report.docx\"")
                    .withBody("rendered file content".getBytes(StandardCharsets.UTF_8))));

    byte[] templateContent = "template content".getBytes(StandardCharsets.UTF_8);
    Map<String, Object> data = Map.of("name", "Test Report");

    // Act
    CdogsClient.RenderResult result =
        cdogsClient.renderDocument(templateContent, "docx", data, "report");

    // Assert
    assertThat(result.content()).isEqualTo("rendered file content".getBytes(StandardCharsets.UTF_8));
    assertThat(result.contentType())
        .isEqualTo(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assertThat(result.fileName()).isEqualTo("generated_report.docx");

    cdogsApiStub.verify(
        postRequestedFor(urlPathEqualTo("/template/render"))
            .withHeader("Authorization", equalTo("Bearer mock-access-token"))
            .withRequestBody(containing("base64"))
            .withRequestBody(containing("reportName")));
  }

  @Test
  @DisplayName("renderDocument uses default content type when response has none")
  void renderDocument_shouldDefaultContentType_whenMissing() {
    cdogsApiStub.stubFor(
        post(urlPathEqualTo("/template/render"))
            .willReturn(
                aResponse()
                    .withStatus(200)
                    .withHeader(
                        "Content-Disposition",
                        "attachment; filename=\"report.docx\"")
                    .withBody("data".getBytes(StandardCharsets.UTF_8))));

    CdogsClient.RenderResult result =
        cdogsClient.renderDocument(
            "test".getBytes(StandardCharsets.UTF_8),
            "docx",
            Map.of(),
            "report");

    assertThat(result.contentType()).isEqualTo("application/octet-stream");
    assertThat(result.fileName()).isEqualTo("report.docx");
  }

  @Test
  @DisplayName("renderDocument derives file name from reportName when no Content-Disposition")
  void renderDocument_shouldDeriveFileName_whenNoDisposition() {
    cdogsApiStub.stubFor(
        post(urlPathEqualTo("/template/render"))
            .willReturn(
                aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/pdf")
                    .withBody("pdf data".getBytes(StandardCharsets.UTF_8))));

    CdogsClient.RenderResult result =
        cdogsClient.renderDocument(
            "test".getBytes(StandardCharsets.UTF_8),
            "pdf",
            Map.of(),
            "my-report");

    assertThat(result.fileName()).isEqualTo("my-report.pdf");
  }

  @Test
  @DisplayName("uploadTemplate posts to /template and returns template hash")
  void uploadTemplate_shouldReturnTemplateHash() {
    cdogsApiStub.stubFor(
        post(urlPathEqualTo("/template"))
            .willReturn(
                aResponse()
                    .withStatus(201)
                    .withHeader("X-Template-Hash", "abc123def456")));

    String templateId =
        cdogsClient.uploadTemplate(
            "template content".getBytes(StandardCharsets.UTF_8), "docx");

    assertThat(templateId).isEqualTo("abc123def456");

    cdogsApiStub.verify(
        postRequestedFor(urlPathEqualTo("/template"))
            .withHeader("Authorization", equalTo("Bearer mock-access-token")));
  }

  @Test
  @DisplayName("uploadTemplate returns null when X-Template-Hash header is missing")
  void uploadTemplate_shouldReturnNull_whenHeaderMissing() {
    cdogsApiStub.stubFor(
        post(urlPathEqualTo("/template"))
            .willReturn(aResponse().withStatus(201)));

    String templateId =
        cdogsClient.uploadTemplate(
            "content".getBytes(StandardCharsets.UTF_8), "xlsx");

    assertThat(templateId).isNull();
  }

  @Test
  @DisplayName("renderFromTemplate posts to /template/{id}/render and returns rendered file")
  void renderFromTemplate_shouldReturnRenderedFile() {
    cdogsApiStub.stubFor(
        post(urlPathEqualTo("/template/abc123/render"))
            .willReturn(
                aResponse()
                    .withStatus(200)
                    .withHeader(
                        "Content-Type",
                        "application/vnd.openxmlformats-officedocument"
                            + ".spreadsheetml.sheet")
                    .withHeader(
                        "Content-Disposition",
                        "attachment; filename=\"output.xlsx\"")
                    .withBody("spreadsheet data".getBytes(StandardCharsets.UTF_8))));

    CdogsClient.RenderResult result =
        cdogsClient.renderFromTemplate("abc123", Map.of("value", 42), "output");

    assertThat(result.content()).isEqualTo("spreadsheet data".getBytes(StandardCharsets.UTF_8));
    assertThat(result.contentType())
        .isEqualTo(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assertThat(result.fileName()).isEqualTo("output.xlsx");

    cdogsApiStub.verify(
        postRequestedFor(urlPathEqualTo("/template/abc123/render"))
            .withHeader("Authorization", equalTo("Bearer mock-access-token")));
  }

  @Test
  @DisplayName("renderFromTemplate uses reportName as file name when no Content-Disposition")
  void renderFromTemplate_shouldDeriveFileName_whenNoDisposition() {
    cdogsApiStub.stubFor(
        post(urlPathEqualTo("/template/abc123/render"))
            .willReturn(
                aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/pdf")
                    .withBody("data".getBytes(StandardCharsets.UTF_8))));

    CdogsClient.RenderResult result =
        cdogsClient.renderFromTemplate("abc123", Map.of(), "my-report");

    assertThat(result.fileName()).isEqualTo("my-report");
  }

  @Test
  @DisplayName("renderDocument propagates 400 error from CDOGS as RestClientResponseException")
  void renderDocument_shouldPropagate400Error() {
    cdogsApiStub.stubFor(
        post(urlPathEqualTo("/template/render"))
            .willReturn(aResponse().withStatus(400).withBody("Bad request")));

    assertThatThrownBy(
            () ->
                cdogsClient.renderDocument(
                    "test".getBytes(StandardCharsets.UTF_8),
                    "docx",
                    Map.of(),
                    "report"))
        .isInstanceOf(RestClientResponseException.class);
  }

  @Test
  @DisplayName("renderDocument propagates 500 error from CDOGS as RestClientResponseException")
  void renderDocument_shouldPropagate500Error() {
    cdogsApiStub.stubFor(
        post(urlPathEqualTo("/template/render"))
            .willReturn(aResponse().withStatus(500).withBody("Internal error")));

    assertThatThrownBy(
            () ->
                cdogsClient.renderDocument(
                    "test".getBytes(StandardCharsets.UTF_8),
                    "docx",
                    Map.of(),
                    "report"))
        .isInstanceOf(RestClientResponseException.class);
  }

  @Test
  @DisplayName("uploadTemplate propagates 400 error from CDOGS as RestClientResponseException")
  void uploadTemplate_shouldPropagate400Error() {
    cdogsApiStub.stubFor(
        post(urlPathEqualTo("/template"))
            .willReturn(aResponse().withStatus(400).withBody("Bad request")));

    assertThatThrownBy(
            () ->
                cdogsClient.uploadTemplate(
                    "test".getBytes(StandardCharsets.UTF_8), "docx"))
        .isInstanceOf(RestClientResponseException.class);
  }
}

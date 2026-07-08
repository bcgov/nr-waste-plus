package ca.bc.gov.nrs.hrs.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.provider.cdogs.CdogsClient;
import ca.bc.gov.nrs.hrs.provider.cdogs.CdogsClient.RenderResult;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | DocumentController")
class DocumentControllerTest {

  private MockMvc mockMvc;
  private JsonMapper objectMapper;

  @Mock
  private CdogsClient cdogsClient;

  @BeforeEach
  void setUp() {
    objectMapper =
        JsonMapper.builder()
            .findAndAddModules()
            .configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
            .build();

    DocumentController controller = new DocumentController(cdogsClient, objectMapper);

    mockMvc =
        MockMvcBuilders.standaloneSetup(controller)
            .setMessageConverters(
                new ByteArrayHttpMessageConverter(),
                new JacksonJsonHttpMessageConverter(objectMapper))
            .build();
  }

  @Test
  @DisplayName("POST /api/documents/render — 200 with file download when multipart is valid")
  void renderDocument_shouldReturnFile_whenMultipartValid() throws Exception {
    RenderResult renderResult =
        new RenderResult(
            "rendered content".getBytes(StandardCharsets.UTF_8),
            "application/pdf",
            "report.pdf");

    when(cdogsClient.renderDocument(
            any(byte[].class), eq("pdf"), any(Map.class), eq("monthly-report")))
        .thenReturn(renderResult);

    MockMultipartFile template =
        new MockMultipartFile(
            "template",
            "template.pdf",
            MediaType.APPLICATION_PDF_VALUE,
            "template content".getBytes(StandardCharsets.UTF_8));

    mockMvc
        .perform(
            multipart("/api/documents/render")
                .file(template)
                .param("data", "{\"year\": 2026, \"month\": \"June\"}")
                .param("reportName", "monthly-report"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/pdf"))
        .andExpect(
            header().string(
                HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"report.pdf\""))
        .andExpect(content().bytes("rendered content".getBytes(StandardCharsets.UTF_8)));
  }

  @Test
  @DisplayName("POST /api/documents/render — 400 when file has no extension")
  void renderDocument_shouldReturn400_whenFileHasNoExtension() throws Exception {
    MockMultipartFile template =
        new MockMultipartFile(
            "template",
            "noextension",
            MediaType.APPLICATION_OCTET_STREAM_VALUE,
            "content".getBytes(StandardCharsets.UTF_8));

    mockMvc
        .perform(
            multipart("/api/documents/render")
                .file(template)
                .param("data", "{}")
                .param("reportName", "report"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /api/documents/render — 400 when file name is null")
  void renderDocument_shouldReturn400_whenFileNameIsNull() throws Exception {
    MockMultipartFile template =
        new MockMultipartFile(
            "template",
            null,
            MediaType.APPLICATION_OCTET_STREAM_VALUE,
            "content".getBytes(StandardCharsets.UTF_8));

    mockMvc
        .perform(
            multipart("/api/documents/render")
                .file(template)
                .param("data", "{}")
                .param("reportName", "report"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /api/documents/render — 400 when data JSON is invalid")
  void renderDocument_shouldReturn400_whenDataIsInvalidJson() throws Exception {
    MockMultipartFile template =
        new MockMultipartFile(
            "template",
            "report.docx",
            MediaType.APPLICATION_OCTET_STREAM_VALUE,
            "content".getBytes(StandardCharsets.UTF_8));

    mockMvc
        .perform(
            multipart("/api/documents/render")
                .file(template)
                .param("data", "not valid json")
                .param("reportName", "report"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /api/documents/templates — 200 with templateId")
  void uploadTemplate_shouldReturnTemplateId() throws Exception {
    when(cdogsClient.uploadTemplate(any(byte[].class), eq("docx")))
        .thenReturn("template-hash-123");

    MockMultipartFile template =
        new MockMultipartFile(
            "template",
            "template.docx",
            MediaType.APPLICATION_OCTET_STREAM_VALUE,
            "content".getBytes(StandardCharsets.UTF_8));

    mockMvc
        .perform(
            multipart("/api/documents/templates")
                .file(template))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.templateId").value("template-hash-123"));
  }

  @Test
  @DisplayName("POST /api/documents/templates — 400 when file has no extension")
  void uploadTemplate_shouldReturn400_whenFileHasNoExtension() throws Exception {
    MockMultipartFile template =
        new MockMultipartFile(
            "template",
            "noextension",
            MediaType.APPLICATION_OCTET_STREAM_VALUE,
            "content".getBytes(StandardCharsets.UTF_8));

    mockMvc
        .perform(
            multipart("/api/documents/templates")
                .file(template))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /api/documents/templates — 400 when file name is null")
  void uploadTemplate_shouldReturn400_whenFileNameIsNull() throws Exception {
    MockMultipartFile template =
        new MockMultipartFile(
            "template",
            null,
            MediaType.APPLICATION_OCTET_STREAM_VALUE,
            "content".getBytes(StandardCharsets.UTF_8));

    mockMvc
        .perform(
            multipart("/api/documents/templates")
                .file(template))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /api/documents/templates/{id}/render — 200 with file download")
  void renderFromTemplate_shouldReturnFile() throws Exception {
    RenderResult renderResult =
        new RenderResult(
            "rendered from template".getBytes(StandardCharsets.UTF_8),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "output.docx");

    when(cdogsClient.renderFromTemplate(
            eq("abc123"), any(Map.class), eq("custom-report")))
        .thenReturn(renderResult);

    mockMvc
        .perform(
            post("/api/documents/templates/abc123/render")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(
                        Map.of("data", Map.of("title", "Test"), "reportName", "custom-report"))))
        .andExpect(status().isOk())
        .andExpect(
            header().string(
                HttpHeaders.CONTENT_TYPE,
                "application/vnd.openxmlformats-officedocument"
                    + ".wordprocessingml.document"))
        .andExpect(
            header().string(
                HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"output.docx\""))
        .andExpect(
            content().bytes(
                "rendered from template".getBytes(StandardCharsets.UTF_8)));
  }

  @Test
  @DisplayName("POST /api/documents/templates/{id}/render — uses defaults when body is empty")
  void renderFromTemplate_shouldUseDefaults_whenBodyEmpty() throws Exception {
    RenderResult renderResult =
        new RenderResult(
            "data".getBytes(StandardCharsets.UTF_8),
            "application/pdf",
            "document");

    when(cdogsClient.renderFromTemplate(
            eq("abc123"), eq(Map.of()), eq("document")))
        .thenReturn(renderResult);

    mockMvc
        .perform(
            post("/api/documents/templates/abc123/render")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isOk())
        .andExpect(content().bytes("data".getBytes(StandardCharsets.UTF_8)));
  }

  @Test
  @DisplayName("renderDocument passes correct file type extracted from extension")
  void renderDocument_shouldPassCorrectFileType() throws Exception {
    when(cdogsClient.renderDocument(
            any(byte[].class), eq("xlsx"), any(Map.class), eq("report")))
        .thenReturn(new RenderResult(new byte[0], "application/octet-stream", "report.xlsx"));

    MockMultipartFile template =
        new MockMultipartFile(
            "template",
            "spreadsheet.xlsx",
            MediaType.APPLICATION_OCTET_STREAM_VALUE,
            "data".getBytes(StandardCharsets.UTF_8));

    mockMvc
        .perform(
            multipart("/api/documents/render")
                .file(template)
                .param("data", "{}")
                .param("reportName", "report"))
        .andExpect(status().isOk());

    verify(cdogsClient)
        .renderDocument(any(byte[].class), eq("xlsx"), any(Map.class), eq("report"));
  }
}

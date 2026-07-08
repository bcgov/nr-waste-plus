package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.provider.cdogs.CdogsClient;
import ca.bc.gov.nrs.hrs.provider.cdogs.CdogsClient.RenderResult;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import io.micrometer.observation.annotation.Observed;

import java.io.IOException;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST controller for document generation via the CDOGS service.
 *
 * <p>Provides endpoints for rendering documents from uploaded templates, uploading
 * templates for later reuse, and rendering documents from previously uploaded
 * templates. All endpoints are exposed under {@code /api/documents}.</p>
 *
 * @since 1.0.0
 */
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Slf4j
@Observed
public class DocumentController {

  private final CdogsClient cdogsClient;
  private final ObjectMapper objectMapper;

  /**
   * Renders a document from an uploaded template file.
   *
   * <p>Accepts a multipart upload containing the template file, a JSON string
   * with the data to merge, and a report name. Delegates rendering to the CDOGS
   * service and returns the generated document as a downloadable attachment.</p>
   *
   * @param template   the template file (e.g. .docx, .odt)
   * @param data       JSON string containing the data to merge into the template
   * @param reportName the name of the generated report
   * @return the rendered document as a byte array with appropriate Content-Type
   *     and Content-Disposition headers
   * @throws IOException if the template file cannot be read
   */
  @PostMapping(value = "/render", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<byte[]> renderDocument(
      @RequestParam("template") MultipartFile template,
      @RequestParam("data") String data,
      @RequestParam("reportName") String reportName
  ) throws IOException {
    String originalFilename = template.getOriginalFilename();
    if (originalFilename == null || !originalFilename.contains(".")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "Template file must have an extension (e.g., .docx, .odt)");
    }
    String fileType = originalFilename.substring(originalFilename.lastIndexOf('.') + 1);

    Map<String, Object> dataMap;
    try {
      dataMap = objectMapper.readValue(data, new TypeReference<>() {});
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "Invalid JSON in 'data' field: " + e.getMessage());
    }

    RenderResult result = cdogsClient.renderDocument(
        template.getBytes(), fileType, dataMap, reportName);

    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(result.contentType()))
        .header(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + result.fileName() + "\"")
        .body(result.content());
  }

  /**
   * Uploads a template to the CDOGS service for later reuse.
   *
   * <p>Accepts a multipart upload containing the template file and returns a
   * template identifier that can be used with the
   * {@code /api/documents/templates/{templateId}/render} endpoint.</p>
   *
   * @param template the template file to upload
   * @return a map containing the {@code templateId} for future render requests
   * @throws IOException if the template file cannot be read
   */
  @PostMapping(value = "/templates", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Map<String, String> uploadTemplate(
      @RequestParam("template") MultipartFile template
  ) throws IOException {
    String originalFilename = template.getOriginalFilename();
    if (originalFilename == null || !originalFilename.contains(".")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "Template file must have an extension (e.g., .docx, .odt)");
    }
    String fileType = originalFilename.substring(originalFilename.lastIndexOf('.') + 1);

    String templateId = cdogsClient.uploadTemplate(template.getBytes(), fileType);

    return Map.of("templateId", templateId);
  }

  /**
   * Renders a document from a previously uploaded template.
   *
   * <p>Accepts a template identifier, optional data, and an optional report
   * name. Delegates rendering to the CDOGS service and returns the generated
   * document as a downloadable attachment.</p>
   *
   * @param templateId the template identifier returned from the upload endpoint
   * @param request    JSON body containing optional {@code data} and
   *     {@code reportName} fields
   * @return the rendered document as a byte array with appropriate Content-Type
   *     and Content-Disposition headers
   */
  @PostMapping("/templates/{templateId}/render")
  public ResponseEntity<byte[]> renderFromTemplate(
      @PathVariable String templateId,
      @RequestBody Map<String, Object> request
  ) {
    @SuppressWarnings("unchecked")
    Map<String, Object> data = (Map<String, Object>) request.getOrDefault("data", Map.of());
    String reportName = (String) request.getOrDefault("reportName", "document");

    RenderResult result = cdogsClient.renderFromTemplate(templateId, data, reportName);

    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(result.contentType()))
        .header(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + result.fileName() + "\"")
        .body(result.content());
  }
}

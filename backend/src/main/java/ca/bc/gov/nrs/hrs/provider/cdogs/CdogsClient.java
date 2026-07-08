package ca.bc.gov.nrs.hrs.provider.cdogs;

import io.micrometer.observation.annotation.Observed;
import java.util.Base64;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Client for the CDOGS document generation service.
 *
 * <p>Provides three operations:
 * <ol>
 *   <li>{@link #renderDocument(byte[], String, Map, String)} — renders a document from an
 *   uploaded byte[] template;</li>
 *   <li>{@link #uploadTemplate(byte[], String)} — uploads a template and returns its hash
 *   ID;</li>
 *   <li>{@link #renderFromTemplate(String, Map, String)} — renders a document from a
 *   previously uploaded template hash.</li>
 * </ol>
 *
 * <p>All methods obtain a Bearer token from {@link CdogsTokenService} and delegate
 * HTTP calls to the {@code cdogsApi} {@link RestClient}. Errors are not handled locally;
 * {@link org.springframework.web.client.RestClientResponseException} propagates to the
 * global exception handler.
 */
@Slf4j
@Component
@Observed
public class CdogsClient {

  /**
   * Result of a render operation.
   *
   * @param content     the rendered document bytes
   * @param contentType the MIME content type of the response
   * @param fileName    the file name extracted from the Content-Disposition header
   */
  public record RenderResult(byte[] content, String contentType, String fileName) {

  }

  private final RestClient cdogsApi;
  private final CdogsTokenService tokenService;

  public CdogsClient(
      @Qualifier("cdogsApi") RestClient cdogsApi,
      CdogsTokenService tokenService
  ) {
    this.cdogsApi = cdogsApi;
    this.tokenService = tokenService;
  }

  /**
   * Renders a document from raw template bytes.
   *
   * @param templateContent the template file content
   * @param fileType        the template file type (e.g. "docx", "xlsx")
   * @param data            the data to merge into the template
   * @param reportName      the generated report name
   * @return a {@link RenderResult} containing the rendered document bytes, content type,
   *     and file name
   */
  public RenderResult renderDocument(
      byte[] templateContent,
      String fileType,
      Map<String, Object> data,
      String reportName
  ) {
    String token = tokenService.getAccessToken();
    String encodedContent = Base64.getEncoder().encodeToString(templateContent);

    Map<String, Object> requestBody = Map.of(
        "data", data,
        "options", Map.of("reportName", reportName, "overwrite", true),
        "template", Map.of(
            "fileType", fileType,
            "encodingType", "base64",
            "content", encodedContent
        )
    );

    ResponseEntity<byte[]> response = cdogsApi
        .post()
        .uri("/template/render")
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .body(requestBody)
        .retrieve()
        .toEntity(byte[].class);

    String contentType = response.getHeaders().getContentType() != null
        ? response.getHeaders().getContentType().toString()
        : MediaType.APPLICATION_OCTET_STREAM_VALUE;

    String disposition = response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION);
    String fileName = disposition != null
        ? ContentDisposition.parse(disposition).getFilename()
        : reportName + "." + fileType;

    return new RenderResult(response.getBody(), contentType, fileName);
  }

  /**
   * Uploads a template to CDOGS and returns its template hash identifier.
   *
   * @param templateContent the template file content
   * @param fileType        the template file type (e.g. "docx", "xlsx")
   * @return the {@code X-Template-Hash} value, or {@code null} if the header is not
   *     present
   */
  public String uploadTemplate(byte[] templateContent, String fileType) {
    String token = tokenService.getAccessToken();
    String encodedContent = Base64.getEncoder().encodeToString(templateContent);

    Map<String, Object> requestBody = Map.of(
        "fileType", fileType,
        "encodingType", "base64",
        "content", encodedContent
    );

    ResponseEntity<Void> response = cdogsApi
        .post()
        .uri("/template")
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .body(requestBody)
        .retrieve()
        .toBodilessEntity();

    String templateHash = response.getHeaders().getFirst("X-Template-Hash");
    if (templateHash == null) {
      log.warn("X-Template-Hash header not found in CDOGS upload response");
      return null;
    }
    return templateHash;
  }

  /**
   * Renders a document from a previously uploaded template hash.
   *
   * @param templateId the template hash ID returned from {@link #uploadTemplate}
   * @param data       the data to merge into the template
   * @param reportName the generated report name
   * @return a {@link RenderResult} containing the rendered document bytes, content type,
   *     and file name
   */
  public RenderResult renderFromTemplate(
      String templateId,
      Map<String, Object> data,
      String reportName
  ) {
    String token = tokenService.getAccessToken();

    Map<String, Object> requestBody = Map.of(
        "data", data,
        "options", Map.of("reportName", reportName, "overwrite", true)
    );

    ResponseEntity<byte[]> response = cdogsApi
        .post()
        .uri("/template/{templateId}/render", templateId)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .body(requestBody)
        .retrieve()
        .toEntity(byte[].class);

    String contentType = response.getHeaders().getContentType() != null
        ? response.getHeaders().getContentType().toString()
        : MediaType.APPLICATION_OCTET_STREAM_VALUE;

    String disposition = response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION);
    String fileName = disposition != null
        ? ContentDisposition.parse(disposition).getFilename()
        : reportName;

    return new RenderResult(response.getBody(), contentType, fileName);
  }
}

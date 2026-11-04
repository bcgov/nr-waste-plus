package ca.bc.gov.nrs.hrs.service.reliability;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * HttpServletRequest wrapper that bounds and buffers the request body so it can be read multiple
 * times safely without unbounded heap consumption.
 */
public class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {

  public static final int DEFAULT_MAX_BODY_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
  private static final int BUFFER_SIZE = 8192;

  private final byte[] cachedBody;

  /**
   * Constructs the cached body request wrapper using the default body size limit (2 MB).
   *
   * @param request the underlying HTTP servlet request
   * @throws IOException if reading the input stream fails
   * @throws ResponseStatusException if the payload exceeds the maximum size limit
   */
  public CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
    this(request, DEFAULT_MAX_BODY_SIZE_BYTES);
  }

  /**
   * Constructs the cached body request wrapper with an explicit maximum body size limit.
   *
   * @param request the underlying HTTP servlet request
   * @param maxBodySizeBytes maximum allowed request body size in bytes
   * @throws IOException if reading the input stream fails
   * @throws ResponseStatusException if the payload exceeds the maximum size limit
   */
  public CachedBodyHttpServletRequest(HttpServletRequest request, int maxBodySizeBytes)
      throws IOException {
    super(request);

    long contentLength = resolveContentLength(request);
    if (contentLength > maxBodySizeBytes) {
      throw new ResponseStatusException(
          HttpStatus.PAYLOAD_TOO_LARGE,
          "Request body exceeds maximum allowed size of " + maxBodySizeBytes + " bytes.");
    }

    InputStream requestInputStream = request.getInputStream();
    if (requestInputStream == null) {
      this.cachedBody = new byte[0];
      return;
    }

    ByteArrayOutputStream outputStream = new ByteArrayOutputStream(
        contentLength > 0 ? (int) contentLength : BUFFER_SIZE);

    byte[] buffer = new byte[BUFFER_SIZE];
    int bytesRead;
    int totalBytes = 0;
    while ((bytesRead = requestInputStream.read(buffer)) != -1) {
      totalBytes += bytesRead;
      if (totalBytes > maxBodySizeBytes) {
        throw new ResponseStatusException(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "Request body exceeds maximum allowed size of " + maxBodySizeBytes + " bytes.");
      }
      outputStream.write(buffer, 0, bytesRead);
    }
    this.cachedBody = outputStream.toByteArray();
  }

  private static long resolveContentLength(HttpServletRequest request) {
    String header = request.getHeader(HttpHeaders.CONTENT_LENGTH);
    if (header != null && !header.isBlank()) {
      try {
        return Long.parseLong(header.trim());
      } catch (NumberFormatException ignored) {
        // Fall back to standard method
      }
    }
    return request.getContentLengthLong();
  }

  /**
   * Retrieves the raw cached body bytes.
   *
   * @return the cached byte array
   */
  public byte[] getCachedBody() {
    return cachedBody;
  }

  @Override
  public ServletInputStream getInputStream() {
    ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(cachedBody);
    return new ServletInputStream() {
      @Override
      public boolean isFinished() {
        return byteArrayInputStream.available() == 0;
      }

      @Override
      public boolean isReady() {
        return true;
      }

      @Override
      public void setReadListener(ReadListener readListener) {
        // Synchronous reads only
      }

      @Override
      public int read() {
        return byteArrayInputStream.read();
      }

      @Override
      public int read(byte[] b, int off, int len) {
        return byteArrayInputStream.read(b, off, len);
      }
    };
  }

  @Override
  public BufferedReader getReader() {
    String encoding = getCharacterEncoding();
    Charset charset = encoding != null ? Charset.forName(encoding) : StandardCharsets.UTF_8;
    return new BufferedReader(new InputStreamReader(getInputStream(), charset));
  }
}

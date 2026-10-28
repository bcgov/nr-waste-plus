package ca.bc.gov.nrs.hrs.service.reliability;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

/**
 * HttpServletRequest wrapper that buffers the request body so it can be read multiple times.
 */
public class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {

  private final byte[] cachedBody;

  /**
   * Constructs the cached body request wrapper and eagerly buffers any request payload.
   *
   * @param request the underlying HTTP servlet request
   * @throws IOException if reading the input stream fails
   */
  public CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
    super(request);
    InputStream requestInputStream = request.getInputStream();
    this.cachedBody = requestInputStream != null ? requestInputStream.readAllBytes() : new byte[0];
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


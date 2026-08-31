package ca.bc.gov.nrs.hrs.util;

import ca.bc.gov.nrs.hrs.exception.ConditionalRequestException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Shared support for strong ETag and If-Match conditional request handling. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ConditionalRequestSupport {

  private static final String IF_MATCH_HEADER = "If-Match";

  /**
   * Requires an exact strong ETag for the supplied current revision.
   *
   * @param request current HTTP request
   * @param currentRevision current resource revision
   * @throws ConditionalRequestException when the header is absent or not an exact strong match
   */
  public static void requireMatch(HttpServletRequest request, long currentRevision) {
    String ifMatch = request.getHeader(IF_MATCH_HEADER);
    String expected = eTagOf(currentRevision);
    if (!expected.equals(ifMatch)) {
      throw new ConditionalRequestException();
    }
  }

  /**
   * Formats a revision as a strong quoted ETag.
   *
   * @param revision resource revision
   * @return the strong ETag, for example {@code "7"}
   */
  // CHECKSTYLE.SUPPRESS: MethodName
  public static String eTagOf(long revision) {
    return String.format("\"%d\"", revision);
  }
}

package ca.bc.gov.nrs.hrs.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.exception.ConditionalRequestException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

@DisplayName("Conditional request support")
class ConditionalRequestSupportTest {

  @ParameterizedTest(name = "revision {0} is formatted as {1}")
  @MethodSource("revisions")
  @DisplayName("formats revisions as strong quoted ETags")
  void shouldFormatStrongQuotedTag(long revision, String expectedTag) {
    assertThat(ConditionalRequestSupport.eTagOf(revision)).isEqualTo(expectedTag);
  }

  @ParameterizedTest(name = "accepts exact tag {1} for revision {0}")
  @MethodSource("revisions")
  @DisplayName("accepts an exact strong If-Match revision")
  void shouldAcceptExactStrongMatch(long revision, String expectedTag) {
    HttpServletRequest request = requestWithIfMatch(expectedTag);

    ConditionalRequestSupport.requireMatch(request, revision);

    verify(request).getHeader("If-Match");
  }

  @Test
  @DisplayName("rejects a missing If-Match revision")
  void shouldRejectMissingMatch() {
    HttpServletRequest request = requestWithIfMatch(null);

    assertThatThrownBy(() -> ConditionalRequestSupport.requireMatch(request, 42L))
        .isInstanceOf(ConditionalRequestException.class)
        .hasMessageContaining(
            "The If-Match header is required and must match the current resource revision.");
  }

  @ParameterizedTest(name = "rejects If-Match value {0}")
  @MethodSource("nonExactValues")
  @DisplayName("rejects non-exact strong If-Match values")
  void shouldRejectNonExactMatch(String value) {
    HttpServletRequest request = requestWithIfMatch(value);

    assertThatThrownBy(() -> ConditionalRequestSupport.requireMatch(request, 42L))
        .isInstanceOf(ConditionalRequestException.class)
        .hasMessageContaining(
            "The If-Match header is required and must match the current resource revision.");
  }

  private static Stream<Arguments> revisions() {
    return Stream.of(
        Arguments.of(Long.MIN_VALUE, "\"-9223372036854775808\""),
        Arguments.of(-1L, "\"-1\""),
        Arguments.of(0L, "\"0\""),
        Arguments.of(42L, "\"42\""),
        Arguments.of(Long.MAX_VALUE, "\"9223372036854775807\""));
  }

  private static Stream<String> nonExactValues() {
    return Stream.of(
        null,
        "",
        " ",
        "  \"42\"  ",
        "\"41\"",
        "\"42\", \"41\"",
        "W/\"42\"",
        "w/\"42\"",
        "42",
        "\"42",
        "42\"",
        "*",
        "* , \"42\"");
  }

  private static HttpServletRequest requestWithIfMatch(String value) {
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getHeader("If-Match")).thenReturn(value);
    return request;
  }
}

package ca.bc.gov.nrs.hrs.util;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Golden-file contract helper for backend tests.
 *
 * <p>A golden test calls {@link #assertMatches(String, String)} with the path
 * of the contract file relative to {@code shared/contracts/} at the repository
 * root, and the actual JSON serialized by the real MVC stack. The file is
 * <em>generated only</em>: it is written when the update flag is on, and
 * compared otherwise. Never hand-edit a golden file — fix the test data or the
 * DTO and regenerate.
 *
 * <p>Update mode is enabled with the {@code golden.update} system property or
 * the {@code GOLDEN_UPDATE} environment variable set to {@code true}. Because
 * Maven does not forward CLI {@code -D} properties to the forked test JVM, the
 * environment variable is the reliable channel:
 *
 * <pre>{@code
 * # compare mode (the default; what CI runs)
 * ./mvnw verify -P all-tests
 * # regenerate one or more golden files (reviewable diff, then commit)
 * GOLDEN_UPDATE=true ./mvnw verify -P all-tests
 * }</pre>
 */
public final class GoldenFiles {

  private static final JsonMapper MAPPER = JsonMapper.builder().findAndAddModules().build();

  private GoldenFiles() {}

  /**
   * Compares {@code actualJson} against the golden file at
   * {@code shared/contracts/<relativePath>}. In update mode writes the file
   * instead (pretty-printed, stable key order, trailing newline) and passes.
   *
   * @param relativePath contract path relative to {@code shared/contracts/}
   * @param actualJson the response body serialized by the real MVC stack
   * @throws IOException when the golden file cannot be read or written
   */
  public static void assertMatches(String relativePath, String actualJson) throws IOException {
    Path golden = resolveContractsDir().resolve(relativePath);

    if (updateMode()) {
      writeGolden(golden, actualJson);
      return;
    }

    if (!Files.exists(golden)) {
      throw new AssertionError(
          """
          Missing golden file: %s
          Generate it with: GOLDEN_UPDATE=true ./mvnw verify -P all-tests
          (run from backend/, then review the diff under shared/contracts/ before committing)
          """
              .formatted(golden));
    }

    JsonNode expected = MAPPER.readTree(Files.readString(golden, UTF_8));
    JsonNode actual = MAPPER.readTree(actualJson);

    if (!expected.equals(actual)) {
      throw new AssertionError(diffMessage(relativePath, expected, actual));
    }
  }

  private static boolean updateMode() {
    return "true".equalsIgnoreCase(System.getProperty("golden.update"))
        || "true".equalsIgnoreCase(System.getenv("GOLDEN_UPDATE"));
  }

  /**
   * Walks up from the working directory until a folder containing
   * {@code shared/contracts} is found, so tests resolve identically from the
   * CLI (backend/ as working directory) and from the IDE (module root).
   */
  static Path resolveContractsDir() {
    Path cwd = Paths.get("").toAbsolutePath();
    for (Path dir = cwd; dir != null; dir = dir.getParent()) {
      Path candidate = dir.resolve("shared").resolve("contracts");
      if (Files.isDirectory(candidate)) {
        return candidate;
      }
    }
    throw new IllegalStateException(
        "Could not locate shared/contracts walking up from " + cwd);
  }

  private static void writeGolden(Path golden, String actualJson) throws IOException {
    JsonNode tree = MAPPER.readTree(actualJson);
    // Jackson's pretty printer emits the platform line separator, so on Windows
    // the golden would be written with CRLF and churn git diff on Linux CI.
    String pretty =
        (MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(tree) + "\n")
            .replace("\r\n", "\n");
    Files.createDirectories(golden.getParent());
    Files.writeString(golden, pretty, UTF_8);
  }

  private static String diffMessage(String relativePath, JsonNode expected, JsonNode actual) {
    String expectedPretty = truncate(MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(expected));
    String actualPretty = truncate(MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(actual));

    StringBuilder message = new StringBuilder();
    message
        .append("Golden file drifted: ")
        .append(relativePath)
        .append("\n\nIf the change is intentional, regenerate with:\n")
        .append("  GOLDEN_UPDATE=true ./mvnw verify -P all-tests\n")
        .append("...and review the diff under shared/contracts/ before committing.\n\n");
    message.append(firstDiffPointers(expected, actual));
    message.append("\n\n--- expected (golden) ---\n")
        .append(expectedPretty)
        .append("\n--- actual (serialized) ---\n")
        .append(actualPretty)
        .append('\n');
    return message.toString();
  }

  /** Caps an embedded JSON dump so a large payload does not flood the failure log. */
  private static String truncate(String pretty) {
    String[] lines = pretty.split("\n", -1);
    if (lines.length <= 40) {
      return pretty;
    }
    return String.join("\n", java.util.Arrays.copyOfRange(lines, 0, 40))
        + "\n... ("
        + (lines.length - 40)
        + " more lines — full file under shared/contracts/)";
  }

  /** Lists the JSON pointers whose values differ, up to ten entries. */
  private static String firstDiffPointers(JsonNode expected, JsonNode actual) {
    List<String> pointers = new ArrayList<>();
    collectDiffs("", expected, actual, pointers);
    if (pointers.isEmpty()) {
      return "Structural difference (missing or extra object/array keys).";
    }
    return "Differing paths:\n  " + String.join("\n  ", pointers);
  }

  private static void collectDiffs(
      String pointer, JsonNode expected, JsonNode actual, List<String> out) {
    if (out.size() >= 10) {
      return;
    }
    if (expected == null || actual == null) {
      out.add(pointer + ": " + (expected == null ? "absent in golden" : "absent in actual"));
      return;
    }
    if (expected.equals(actual)) {
      return;
    }
    if (expected.isObject() && actual.isObject()) {
      List<String> names = new ArrayList<>();
      expected.propertyNames().forEach(names::add);
      actual.propertyNames().forEach(n -> {
        if (!names.contains(n)) {
          names.add(n);
        }
      });
      for (String name : names) {
        collectDiffs(pointer + "/" + name, expected.get(name), actual.get(name), out);
      }
      return;
    }
    if (expected.isArray() && actual.isArray() && expected.size() == actual.size()) {
      for (int i = 0; i < expected.size() && out.size() < 10; i++) {
        collectDiffs(pointer + "/" + i, expected.get(i), actual.get(i), out);
      }
      return;
    }
    out.add(pointer + ": expected=" + expected + " actual=" + actual);
  }
}

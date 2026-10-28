package ca.bc.gov.nrs.hrs.service.reliability;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Utility for producing canonical request fingerprints (SHA-256 digests) from HTTP method, path,
 * query parameters, and normalized request body.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class IdempotencyFingerprinter {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  /**
   * Computes a canonical SHA-256 fingerprint for the given request and body bytes.
   *
   * @param request the HTTP request providing method, URI, and query string
   * @param bodyBytes the buffered request body bytes
   * @return a 64-character lowercase hex digest
   */
  public static String computeFingerprint(HttpServletRequest request, byte[] bodyBytes) {
    String method = request.getMethod() != null
        ? request.getMethod().toUpperCase(Locale.ROOT) : "";
    String uri = request.getRequestURI() != null ? request.getRequestURI() : "";
    String query = request.getQueryString();
    String path = (query != null && !query.isBlank()) ? uri + "?" + query : uri;
    String normalizedBody = normalizeBody(bodyBytes);

    String canonicalInput = method + "\n" + path + "\n" + normalizedBody;
    return sha256Hex(canonicalInput);
  }

  /**
   * Normalizes request body content into a canonical string. JSON objects have keys sorted
   * recursively to ensure field ordering does not alter the digest.
   *
   * @param bodyBytes the raw body bytes
   * @return normalized body string
   */
  public static String normalizeBody(byte[] bodyBytes) {
    if (bodyBytes == null || bodyBytes.length == 0) {
      return "";
    }
    try {
      JsonNode node = MAPPER.readTree(bodyBytes);
      if (node == null || node.isNull()) {
        return "";
      }
      JsonNode canonicalNode = canonicalize(node);
      return MAPPER.writeValueAsString(canonicalNode);
    } catch (Exception ex) {
      return new String(bodyBytes, StandardCharsets.UTF_8).trim();
    }
  }

  private static JsonNode canonicalize(JsonNode node) {
    if (node == null || node.isNull()) {
      return JsonNodeFactory.instance.nullNode();
    }
    if (node.isObject()) {
      ObjectNode objectNode = (ObjectNode) node;
      ObjectNode sorted = JsonNodeFactory.instance.objectNode();
      List<String> fieldNames = new ArrayList<>();
      objectNode.fieldNames().forEachRemaining(fieldNames::add);
      Collections.sort(fieldNames);
      for (String fieldName : fieldNames) {
        sorted.set(fieldName, canonicalize(objectNode.get(fieldName)));
      }
      return sorted;
    }
    if (node.isArray()) {
      ArrayNode arrayNode = (ArrayNode) node;
      ArrayNode canonicalArray = JsonNodeFactory.instance.arrayNode();
      for (JsonNode item : arrayNode) {
        canonicalArray.add(canonicalize(item));
      }
      return canonicalArray;
    }
    return node;
  }

  private static String sha256Hex(String input) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 algorithm unavailable", e);
    }
  }
}


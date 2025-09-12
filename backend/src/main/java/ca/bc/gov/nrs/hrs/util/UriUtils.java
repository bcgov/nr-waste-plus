package ca.bc.gov.nrs.hrs.util;


import java.util.List;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class UriUtils {

  /**
   * Builds a MultiValueMap with the given key mapped to all values in the list.
   *
   * @param key    the query parameter key
   * @param values the list of values to associate with the key
   * @return a MultiValueMap suitable for use with UriComponentsBuilder.queryParams()
   */
  public static MultiValueMap<String, String> buildMultiValueQueryParam(
      String key, List<String> values
  ) {
    MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
    if (values != null) {
      values
          .stream()
          .filter(StringUtils::isNotBlank)
          .forEach(value -> map.add(key, value));
    }
    return map;
  }
}

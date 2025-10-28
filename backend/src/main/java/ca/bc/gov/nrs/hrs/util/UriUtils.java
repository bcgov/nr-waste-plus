package ca.bc.gov.nrs.hrs.util;


import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Utility helpers for building URI query parameters, particularly for
 * multi-value query parameters and pageable parameters.
 *
 * <p>These helpers return {@link MultiValueMap} instances suitable for use
 * with Spring's {@code UriComponentsBuilder#queryParams()} calls.
 * </p>
 */
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

  /**
   * Convert a {@link Pageable} into a MultiValueMap of query parameters which
   * include page, size and any sort orders.
   *
   * @param page the pageable to convert
   * @return MultiValueMap of pageable query parameters
   */
  public static MultiValueMap<String, String> buildPageableQueryParam(
      Pageable page
  ) {
    MultiValueMap<String, String> multiValueMap = new LinkedMultiValueMap<>();
    if (page != null) {
      multiValueMap.add("page", String.valueOf(page.getPageNumber()));
      multiValueMap.add("size", String.valueOf(page.getPageSize()));
      if (page.getSort().isSorted()) {
        page
            .getSort()
            .forEach(order ->
                multiValueMap
                    .add("sort", order.toString().replace(": ", ","))
            );
      }
    }
    return multiValueMap;
  }
}

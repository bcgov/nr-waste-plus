package ca.bc.gov.nrs.hrs.provider.legacy;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Helper that maps legacy paged JSON responses into typed content and metadata.
 * 
 * <p>This utility component provides methods to parse and extract data from legacy API paged
 * responses, which are typically structured as JSON with {@code content} and {@code page}
 * fields.
 * </p>
 * 
 * <p>The mapper handles:
 * <ul>
 *   <li>Validation of paged response structure</li>
 *   <li>Extraction and conversion of content to typed lists</li>
 *   <li>Reading pagination metadata (total elements, etc.)</li>
 * </ul>
 * </p>
 *
 */
@Component
@RequiredArgsConstructor
public class LegacyPagedResponseMapper {

  private final JsonMapper mapper;

  /**
   * Validates whether a paged JSON response has the required structure.
   * 
   * <p>A valid paged response must contain both {@code content} and {@code page} fields.
   * This method returns {@code true} if the response is null or missing either required field.
   * </p>
   * 
   * @param pagedResponse the JSON response to validate, may be null
   * @return {@code true} if the response is invalid or missing required structure,
   *         {@code false} otherwise
   */
  public boolean isInvalidPage(JsonNode pagedResponse) {
    return pagedResponse == null
        || pagedResponse.get(LegacyApiConstants.CONTENT_CONST) == null
        || pagedResponse.get(LegacyApiConstants.PAGE_CONST) == null;
  }

  /**
   * Extracts and converts the content array from a paged response to a typed list.
   * 
   * <p>This method reads the {@code content} field from the JSON response and converts it
   * to a list of objects of the specified element type using Jackson's type mapping capabilities.
   * </p>
   * 
   * @param <T> the target element type
   * @param pagedResponse the paged JSON response containing content to extract
   * @param elementType the class type to convert each content element to
   * @return a list of typed elements from the content field; never null
   * @throws IllegalArgumentException if content cannot be converted to the target type
   */
  public <T> List<T> readContent(JsonNode pagedResponse, Class<T> elementType) {
    return mapper.convertValue(
        pagedResponse.get(LegacyApiConstants.CONTENT_CONST),
        mapper.getTypeFactory().constructCollectionType(List.class, elementType)
    );
  }

  /**
   * Extracts the total elements count from the pagination metadata in the response.
   * 
   * <p>This method reads the {@code totalElements} field from the {@code page} object
   * in the paged response. If the field is missing or cannot be read, defaults to 0.
   * </p>
   * 
   * @param pagedResponse the paged JSON response containing pagination metadata
   * @return the total number of elements available for the query, or 0 if not available
   * @throws NullPointerException if there's an error accessing the page field
   */
  public long readTotalElements(JsonNode pagedResponse) {
    return pagedResponse
        .get(LegacyApiConstants.PAGE_CONST)
        .get("totalElements")
        .asLong(0L);
  }
}



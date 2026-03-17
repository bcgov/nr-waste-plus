package ca.bc.gov.nrs.hrs.provider.legacy;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Helper that maps legacy paged JSON responses into typed content and metadata.
 */
@Component
@RequiredArgsConstructor
public class LegacyPagedResponseMapper {

  private final JsonMapper mapper;

  public boolean isInvalidPage(JsonNode pagedResponse) {
    return pagedResponse == null
        || pagedResponse.get(LegacyApiConstants.CONTENT_CONST) == null
        || pagedResponse.get(LegacyApiConstants.PAGE_CONST) == null;
  }

  public <T> List<T> readContent(JsonNode pagedResponse, Class<T> elementType) {
    return mapper.convertValue(
        pagedResponse.get(LegacyApiConstants.CONTENT_CONST),
        mapper.getTypeFactory().constructCollectionType(List.class, elementType)
    );
  }

  public long readTotalElements(JsonNode pagedResponse) {
    return pagedResponse
        .get(LegacyApiConstants.PAGE_CONST)
        .get("totalElements")
        .asLong(0L);
  }
}



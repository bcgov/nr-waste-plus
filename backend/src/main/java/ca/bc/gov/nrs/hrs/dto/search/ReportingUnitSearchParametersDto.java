package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.util.UriUtils;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.With;
import org.apache.commons.lang3.BooleanUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.util.CollectionUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Search parameters for reporting unit searches.
 * <p>
 * Contains the set of filter values that can be applied when searching for
 * reporting units. Some getters are overridden (via Lombok 'With') to provide
 * a convenient immutable-style builder; lists may be null or empty and the
 * helper method {@link #toMultiMap(Pageable)} converts the populated fields
 * into request query parameters.
 * </p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@With
@Builder
public class ReportingUnitSearchParametersDto {

  private String mainSearchTerm;
  private List<String> district;
  private List<String> sampling;
  private List<String> status;
  private boolean requestByMe;
  private String requestUserId;
  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
  private LocalDate updateDateStart;
  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
  private LocalDate updateDateEnd;
  private String licenseeId;
  private String cuttingPermitId;
  private String timberMark;
  private String clientLocationCode;
  private String clientNumber;

  /**
   * Convert the populated search parameters into a {@link MultiValueMap} of
   * query parameters suitable for building a request URL. Only non-empty
   * fields are included. The provided {@code page} will be translated into
   * paging parameters and appended.
   *
   * @param page the pageable to include in the produced query parameters; may
   *     be null
   * @return a {@link MultiValueMap} containing non-empty query parameters
   */
  public MultiValueMap<String, String> toMultiMap(Pageable page) {
    LinkedMultiValueMap<String, String> multiValueMap = new LinkedMultiValueMap<>();

    if (StringUtils.isNotBlank(mainSearchTerm)) {
      multiValueMap.add("mainSearchTerm", mainSearchTerm);
    }

    if (!CollectionUtils.isEmpty(district)) {
      district.forEach(value -> multiValueMap.add("district", value));
    }

    if (!CollectionUtils.isEmpty(sampling)) {
      sampling.forEach(value -> multiValueMap.add("sampling", value));
    }

    if (!CollectionUtils.isEmpty(status)) {
      status.forEach(value -> multiValueMap.add("status", value));
    }

    if (StringUtils.isNotBlank(requestUserId)) {
      multiValueMap.add("requestUserId", requestUserId);
    }

    if (StringUtils.isNotBlank(licenseeId)) {
      multiValueMap.add("licenseeId", licenseeId);
    }

    if (StringUtils.isNotBlank(cuttingPermitId)) {
      multiValueMap.add("cuttingPermitId", cuttingPermitId);
    }

    if (StringUtils.isNotBlank(timberMark)) {
      multiValueMap.add("timberMark", timberMark);
    }

    if (StringUtils.isNotBlank(clientLocationCode)) {
      multiValueMap.add("clientLocationCode", clientLocationCode);
    }

    if (StringUtils.isNotBlank(clientNumber)) {
      multiValueMap.add("clientNumber", clientNumber);
    }

    multiValueMap.add("requestByMe", BooleanUtils.toStringTrueFalse(requestByMe));

    if (updateDateStart != null) {
      multiValueMap.add("updateDateStart", updateDateStart.format(DateTimeFormatter.ISO_LOCAL_DATE));
    }

    if (updateDateEnd != null) {
      multiValueMap.add("updateDateEnd", updateDateEnd.format(DateTimeFormatter.ISO_LOCAL_DATE));
    }

    multiValueMap.addAll(UriUtils.buildPageableQueryParam(page));

    return multiValueMap;
  }

  /**
   * Convert the populated search parameters into a {@link MultiValueMap} of
   * query parameters without paging information.
   *
   * @return a {@link MultiValueMap} containing non-empty query parameters
   */
  public MultiValueMap<String, String> toMultiMap() {
    return toMultiMap(null);
  }
}

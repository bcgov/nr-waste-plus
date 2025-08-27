package ca.bc.gov.nrs.hrs.dto.search;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.With;
import org.apache.commons.lang3.BooleanUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.util.CollectionUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * <p>Search parameters for reporting unit search.</p>
 * Some getters are overridden to provide default values if the lists are null or empty.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@With
public class ReportingUnitSearchParametersDto {

  private String mainSearchTerm;
  private List<String> district;
  private List<String> sampling;
  private List<String> status;
  private boolean requestByMe;
  private String requestUserId;
  private LocalDate updateDateStart;
  private LocalDate updateDateEnd;
  private String licenseeId;
  private String cuttingPermitId;
  private String timberMark;
  private String clientLocationCode;
  private String clientNumber;

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

    if (updateDateEnd != null) {
      multiValueMap.add("updateDateEnd", updateDateEnd.format(DateTimeFormatter.ISO_LOCAL_DATE));
    }

    if (updateDateEnd != null) {
      multiValueMap.add("updateDateEnd", updateDateEnd.format(DateTimeFormatter.ISO_LOCAL_DATE));
    }

    if (page != null) {
      multiValueMap.add("page", String.valueOf(page.getPageNumber()));
      multiValueMap.add("size", String.valueOf(page.getPageSize()));
      if (page.getSort().isSorted()) {
        multiValueMap.add("sort", page.getSort().toString().replace(": ", ","));
      }
    }

    return multiValueMap;
  }

  public MultiValueMap<String, String> toMultiMap() {
    return toMultiMap(null);
  }
}

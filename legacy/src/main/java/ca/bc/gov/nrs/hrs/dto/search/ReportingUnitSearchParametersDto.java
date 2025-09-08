package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.With;
import org.apache.commons.lang3.BooleanUtils;
import org.springframework.format.annotation.DateTimeFormat;

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
  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
  private LocalDate updateDateStart;
  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
  private LocalDate updateDateEnd;
  private String licenseeId;
  private String cuttingPermitId;
  private String timberMark;
  private String clientLocationCode;
  private String clientNumber;

  public List<String> getDistrict() {
    if (district == null || district.isEmpty()) {
      return List.of(LegacyConstants.NOVALUE);
    }
    return district;
  }

  public List<String> getSampling() {
    if (sampling == null || sampling.isEmpty()) {
      return List.of(LegacyConstants.NOVALUE);
    }
    return sampling;
  }

  public List<String> getStatus() {
    if (status == null || status.isEmpty()) {
      return List.of(LegacyConstants.NOVALUE);
    }
    return status;
  }

  public String getRequestUserId() {
    return BooleanUtils.toString(
        requestByMe, requestUserId, LegacyConstants.NOVALUE
    );
  }
}

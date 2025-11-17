package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.With;
import org.apache.commons.lang3.BooleanUtils;
import org.springframework.format.annotation.DateTimeFormat;

/**
 * Search parameters used when searching for reporting units.
 *
 * <p>This DTO captures the set of filters the frontend can supply when querying the
 * reporting-unit search endpoint. Several getters are overridden to provide safe, default values
 * when list-based filters are null or empty.</p>
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
  private boolean multiMark;
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
  private List<String> clientNumbers;

  /**
   * Returns the district filter values.
   *
   * <p>If the underlying list is {@code null} or empty, a single-value list containing
   * {@link LegacyConstants#NOVALUE} is returned to indicate an absent filter in downstream
   * processing.</p>
   *
   * @return the district values or a singleton list with {@code NOVALUE} when absent
   */
  public List<String> getDistrict() {
    if (district == null || district.isEmpty()) {
      return List.of(LegacyConstants.NOVALUE);
    }
    return district;
  }

  /**
   * Returns the sampling filter values.
   *
   * <p>If the underlying list is {@code null} or empty, a single-value list containing
   * {@link LegacyConstants#NOVALUE} is returned.</p>
   *
   * @return the sampling values or a singleton list with {@code NOVALUE} when absent
   */
  public List<String> getSampling() {
    if (sampling == null || sampling.isEmpty()) {
      return List.of(LegacyConstants.NOVALUE);
    }
    return sampling;
  }

  /**
   * Returns the status filter values.
   *
   * <p>If the underlying list is {@code null} or empty, a single-value list containing
   * {@link LegacyConstants#NOVALUE} is returned.</p>
   *
   * @return the status values or a singleton list with {@code NOVALUE} when absent
   */
  public List<String> getStatus() {
    if (status == null || status.isEmpty()) {
      return List.of(LegacyConstants.NOVALUE);
    }
    return status;
  }

  /**
   * Returns the client-numbers filter values.
   *
   * <p>If the underlying list is {@code null} or empty, a single-value list containing
   * {@link LegacyConstants#NOVALUE} is returned.</p>
   *
   * @return the client numbers or a singleton list with {@code NOVALUE} when absent
   */
  public List<String> getClientNumbers() {
    if (clientNumbers == null || clientNumbers.isEmpty()) {
      return List.of(LegacyConstants.NOVALUE);
    }
    return clientNumbers;
  }

  /**
   * Returns the request user id when the request is explicitly "by me".
   *
   * <p>Uses {@link org.apache.commons.lang3.BooleanUtils#toString(boolean, String, String)}
   * semantics: if {@code requestByMe} is {@code true} the configured {@code requestUserId} is
   * returned; otherwise {@link LegacyConstants#NOVALUE} is returned.</p>
   *
   * @return the effective request user id or {@code NOVALUE} when not applicable
   */
  public String getRequestUserId() {
    return BooleanUtils.toString(
        requestByMe, requestUserId, LegacyConstants.NOVALUE
    );
  }

  /**
   * Returns the start date formatted as ISO date (yyyy-MM-dd) or {@code NOVALUE} when not
   * provided.
   *
   * @return the ISO-formatted start date or {@link LegacyConstants#NOVALUE} when {@code null}
   */
  public String getDateStart() {
    return updateDateStart != null ? updateDateStart.format(DateTimeFormatter.ISO_DATE)
        : LegacyConstants.NOVALUE;
  }

  /**
   * Returns the end date formatted as ISO date (yyyy-MM-dd) or {@code NOVALUE} when not provided.
   *
   * @return the ISO-formatted end date or {@link LegacyConstants#NOVALUE} when {@code null}
   */
  public String getDateEnd() {
    return updateDateEnd != null ? updateDateEnd.format(DateTimeFormatter.ISO_DATE)
        : LegacyConstants.NOVALUE;
  }
}

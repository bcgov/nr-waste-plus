package ca.bc.gov.nrs.hrs.dto.reportingunit;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.With;

/**
 * Data Transfer Object representing the full details of a Reporting Unit.
 *
 * <p>Aggregates information from both the legacy API and the Forest Client API, presenting a
 * unified view of a reporting unit's identity, client association, status, sampling method, and
 * district.
 * <!-- TODO(grade-configuration): The {@code grade} field has been removed from this contract
 *      because no data source can populate it yet.  It will be reinstated — as a
 *      {@link CodeDescriptionDto} parameter — once the grade-configuration feature branch
 *      wires up the lookup table and the legacy mapping.  When that work lands:
 *        1. Re-add {@code CodeDescriptionDto grade} to this record.
 *        2. Restore the grade parameter in {@code ReportingUnitService#getReportingUnitDetails}.
 *        3. Add the corresponding {@code $.grade.code} / {@code $.grade.description} assertions
 *           to {@code ReportingUnitControllerIntegrationTest} and
 *           {@code ReportingUnitServiceTest}.
 * -->
 *
 * <p>Components:
 * <ul>
 *   <li>{@code id}: the unique identifier of the reporting unit</li>
 *   <li>{@code client}: the client code and name associated with the reporting unit</li>
 *   <li>{@code clientStatus}: the current status code and description of the associated client</li>
 *   <li>{@code sampling}: the sampling method code and description for the reporting unit</li>
 *   <li>{@code district}: the natural resource district code and description</li>
 *   <li>{@code grade}: the harvest grade code and description, unpopulated until grade
 *       configuration</li>
 *   <li>{@code blockRule}: the block-creation rule for the sampling type; omitted when no rule
 *       applies</li>
 *   <li>{@code isLegacy}: true when the reporting unit has no postgres block record and predates
 *       the blocks feature</li>
 * </ul>
 */
@With
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportingUnitDetailsDto(
    Long id,
    CodeDescriptionDto client,
    CodeDescriptionDto clientStatus,
    CodeDescriptionDto sampling,
    CodeDescriptionDto district,
    CodeDescriptionDto grade,
    BlockRuleDto blockRule,
    boolean isLegacy) {

  /**
   * Convenience constructor that leaves block metadata unpopulated.
   *
   * <p>Block metadata is filled in later by {@code ReportingUnitBlockService} before the details
   * are returned to the caller, so details built without block context default to no rule and a
   * legacy marker of {@code false}.
   *
   * @param id the unique identifier of the reporting unit
   * @param client the client code and name associated with the reporting unit
   * @param clientStatus the current status code and description of the associated client
   * @param sampling the sampling method code and description for the reporting unit
   * @param district the natural resource district code and description
   * @param grade the harvest grade code and description, unpopulated until grade configuration
   */
  public ReportingUnitDetailsDto(
      Long id,
      CodeDescriptionDto client,
      CodeDescriptionDto clientStatus,
      CodeDescriptionDto sampling,
      CodeDescriptionDto district,
      CodeDescriptionDto grade) {
    this(id, client, clientStatus, sampling, district, grade, null, false);
  }
}

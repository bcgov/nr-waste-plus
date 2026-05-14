package ca.bc.gov.nrs.hrs.service.reportingunit;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.exception.WasteReportingUnitNotFound;
import ca.bc.gov.nrs.hrs.mappers.reportingunit.ReportingUnitDetailsMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Service that provides detail-retrieval operations for Reporting Units.
 *
 * <p>Exposes a method used by {@link ca.bc.gov.nrs.hrs.controller.ReportingUnitController}
 * to return the high-level metadata of a single Reporting Unit, scoped by the caller's
 * client numbers. When no client numbers are supplied the query falls back to an unrestricted
 * search using {@link LegacyConstants#NOVALUE}.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class ReportingUnitService {

  private final ReportingUnitRepository ruRepository;
  private final ReportingUnitDetailsMapper ruDetailsMapper;

  /**
   * Retrieves the detail view for the given Reporting Unit, scoped to the provided client numbers.
   *
   * <p>When {@code clients} is empty or {@code null}, the query is executed without client
   * restriction by substituting {@link LegacyConstants#NOVALUE}. If no record is found for the
   * supplied {@code reportingUnitId}, a {@link WasteReportingUnitNotFound} exception is thrown.</p>
   *
   * @param reportingUnitId the identifier of the reporting unit to retrieve
   * @param clients         the list of client numbers used to scope the query; may be empty or null
   * @return the {@link ReportingUnitDetailsDto} for the requested reporting unit
   * @throws WasteReportingUnitNotFound if no reporting unit is found for the given ID and clients
   */
  public ReportingUnitDetailsDto getReportingUnitDetails(
      Long reportingUnitId,
      List<String> clients
  ) {
    List<String> searchClients = CollectionUtils.isEmpty(clients) ? List.of(LegacyConstants.NOVALUE) : clients;
    return ruRepository
        .getReportingUnitDetails(reportingUnitId, searchClients)
        .map(ruDetailsMapper::fromProjection)
        .orElseThrow(() -> new WasteReportingUnitNotFound(reportingUnitId));
  }


}

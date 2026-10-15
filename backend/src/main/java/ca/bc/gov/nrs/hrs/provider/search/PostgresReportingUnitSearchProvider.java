package ca.bc.gov.nrs.hrs.provider.search;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.provider.search.ReportingUnitSearchProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * PostgreSQL reporting-unit search provider — explicit V0 stub (issue #1238).
 *
 * <p>The PostgreSQL search implementation is deferred pending the product contract for
 * unsupported filters, expanded fields, and result row/cardinality (OQ-001, OQ-002, OQ-003; see
 * the #1238 plan). When this source is selected the stub fails honestly with HTTP 501 Not
 * Implemented instead of returning an empty page, because an empty page would misrepresent "no
 * PostgreSQL data" (DEC-002).
 *
 * <p>The stub never falls back to the legacy source (DEC-004); the failure propagates to the
 * caller as an RFC 9457 problem detail.
 */
@Slf4j
@Component
public class PostgresReportingUnitSearchProvider implements ReportingUnitSearchProvider {

  /**
   * Fails the request with HTTP 501 because PostgreSQL reporting-unit search is not implemented
   * yet (issue #1238, deferred pending OQ-001/OQ-002/OQ-003).
   *
   * @param filters search filters to apply; unused by the stub
   * @param pageable pagination information; unused by the stub
   * @return never; always throws
   * @throws ResponseStatusException always, with HTTP 501 Not Implemented
   */
  @Override
  public Page<ReportingUnitSearchResultDto> searchReportingUnit(
      ReportingUnitSearchParametersDto filters, Pageable pageable) {
    log.warn("PostgreSQL reporting-unit search requested but not implemented (issue #1238)");
    throw new ResponseStatusException(
        HttpStatus.NOT_IMPLEMENTED,
        "PostgreSQL reporting-unit search is not implemented yet (issue #1238); "
            + "deferred pending product contract OQ-001/OQ-002/OQ-003");
  }
}

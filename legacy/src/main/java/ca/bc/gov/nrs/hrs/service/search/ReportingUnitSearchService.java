package ca.bc.gov.nrs.hrs.service.search;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.mappers.search.ReportingUnitSearchMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.util.PaginationUtil;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class ReportingUnitSearchService {

  private final ReportingUnitRepository ruRepository;
  private final ReportingUnitSearchMapper mapper;
  private static final Map<String, String> SORT_FIELDS =
      Map.ofEntries(
          Map.entry("ruNumber", "ru_number"),
          Map.entry("blockId", "block_id"),
          Map.entry("client", "client_number"),
          Map.entry("clientNumber", "client_number"),
          Map.entry("clientName", "client_number"),
          Map.entry("sampling", "sampling_code"),
          Map.entry("samplingCode", "sampling_code"),
          Map.entry("samplingName", "sampling_code"),
          Map.entry("district", "district_code"),
          Map.entry("districtCode", "district_code"),
          Map.entry("districtName", "district_code"),
          Map.entry("status", "status_code"),
          Map.entry("statusCode", "status_code"),
          Map.entry("statusName", "status_code"),
          Map.entry("lastUpdated", "last_updated")
      );

  @NewSpan
  public Page<ReportingUnitSearchResultDto> search(
      ReportingUnitSearchParametersDto filters,
      Pageable page,
      List<String> userClientNumbers
  ) {

    // #128: limit query by client numbers provided by the roles
    if (StringUtils.isNotBlank(filters.getClientNumber())) {
      if (userClientNumbers.isEmpty() || userClientNumbers.contains(filters.getClientNumber())) {
        filters.setClientNumbers(List.of(filters.getClientNumber()));
      }
    } else {
      filters.setClientNumbers(userClientNumbers);
    }

    log.info("Searching reporting units with filters: {}, pageable: {}", filters, page);

    return ruRepository
        .searchReportingUnits(
            filters,
            PageRequest.of(
                page.getPageNumber(),
                page.getPageSize(),
                PaginationUtil.resolveSort(page.getSort(), "ru_number", SORT_FIELDS)
            )
        )
        .map(mapper::fromProjection);
  }

  public List<String> searchReportingUnitUsers(String userId, List<String> clientFromRoles) {
    log.info(
        "Searching possible users that matches {} withing reporting units that belongs to clients {}",
        userId, clientFromRoles);
    List<String> clients = clientFromRoles != null && !clientFromRoles.isEmpty() ? clientFromRoles
        : List.of(LegacyConstants.NOVALUE);
    return ruRepository
        .searchReportingUnitUsers(
            userId.toUpperCase(Locale.ROOT),
            clients
        );
  }
}

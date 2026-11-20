package ca.bc.gov.nrs.hrs.service.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.mappers.search.ClientDistrictSearchMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdvancedSearchServiceTest {

  private final ReportingUnitRepository repository = mock(ReportingUnitRepository.class);
  private final AdvancedSearchService service =
      new AdvancedSearchService(repository, mock(ClientDistrictSearchMapper.class));

  @Test
  void searchReportingUnitUsersUsesSentinelWhenClientScopeIsNull() {
    when(repository.searchReportingUnitUsers("AUSER", List.of(LegacyConstants.NOVALUE)))
        .thenReturn(List.of("IDIR\\AUSER"));

    List<String> result = service.searchReportingUnitUsers("auser", null);

    assertThat(result).containsExactly("IDIR\\AUSER");
    verify(repository).searchReportingUnitUsers("AUSER", List.of(LegacyConstants.NOVALUE));
  }
}

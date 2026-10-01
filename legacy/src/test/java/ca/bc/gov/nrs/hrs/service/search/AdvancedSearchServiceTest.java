package ca.bc.gov.nrs.hrs.service.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.mappers.search.ClientDistrictSearchMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdvancedSearchServiceTest {

  @Mock
  private ReportingUnitRepository repository;

  @Mock
  private ClientDistrictSearchMapper clientDistrictSearchMapper;

  @InjectMocks
  private AdvancedSearchService service;

  @Test
  void noClientNonIdirSearchUsesNoClientSentinel() {
    when(repository.searchReportingUnitUsers(eq("MATCH"), eq(List.of(LegacyConstants.NOCLIENT))))
        .thenReturn(List.of());

    assertThat(service.searchReportingUnitUsers("match", List.of(LegacyConstants.NOCLIENT)))
        .isEmpty();

    verify(repository).searchReportingUnitUsers("MATCH", List.of(LegacyConstants.NOCLIENT));
  }

  @Test
  void clientScopedSearchPreservesOnlyClaimedClients() {
    when(repository.searchReportingUnitUsers(eq("MATCH"), eq(List.of("00010002"))))
        .thenReturn(List.of("BCeID\\USER"));

    assertThat(service.searchReportingUnitUsers("match", List.of("00010002")))
        .containsExactly("BCeID\\USER");

    verify(repository).searchReportingUnitUsers("MATCH", List.of("00010002"));
  }

  @Test
  void idirSearchUsesEmptyClientListForUnrestrictedQuery() {
    when(repository.searchReportingUnitUsers(eq("MATCH"), eq(List.of(LegacyConstants.NOVALUE))))
        .thenReturn(List.of("IDIR\\USER"));

    assertThat(service.searchReportingUnitUsers("match", List.of())).containsExactly("IDIR\\USER");

    ArgumentCaptor<List<String>> clients = ArgumentCaptor.forClass(List.class);
    verify(repository).searchReportingUnitUsers(eq("MATCH"), clients.capture());
    assertThat(clients.getValue()).containsExactly(LegacyConstants.NOVALUE);
  }
}

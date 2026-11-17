package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Codes Service")
class CodesServiceTest {

  @Mock private LegacyApiProvider legacyApiProvider;
  @Mock private DistrictVolumeService districtVolumeService;

  @InjectMocks private CodesService codesService;

  @Test
  @DisplayName("getMaturityTypeCodes returns unfiltered maturity codes from legacy API")
  void getMaturityTypeCodes_shouldReturnUnfilteredCodes() {
    var maturityCodes =
        List.of(new CodeDescriptionDto("MAT", "Mature"), new CodeDescriptionDto("IMM", "Immature"));
    when(legacyApiProvider.getMaturityTypeCodes()).thenReturn(maturityCodes);

    var result = codesService.getMaturityTypeCodes();

    assertThat(result).containsExactlyElementsOf(maturityCodes);
    verify(legacyApiProvider).getMaturityTypeCodes();
  }
}

package ca.bc.gov.nrs.hrs.entity.reportingunit;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test | Reporting unit block projection contract")
class ReportingUnitBlockProjectionContractTest {

  @Test
  @DisplayName("shouldExposeEveryNativeQueryAlias_asProjectionAccessor")
  void shouldExposeEveryNativeQueryAlias_asProjectionAccessor() throws NoSuchMethodException {
    assertThat(ReportingUnitBlockProjection.class.getDeclaredMethods())
        .extracting(Method::getName)
        .containsExactlyInAnyOrder(
            "getId",
            "getLicenseNumber",
            "getCuttingPermit",
            "getCutBlockId",
            "getTimberMark",
            "getTotalWasteAreaHa",
            "getTotalWasteVolumeM3",
            "getSubmitter",
            "getStatusCode",
            "getStatusName",
            "getLastUpdated");
    assertThat(ReportingUnitBlockProjection.class.getMethod("getTotalWasteAreaHa").getReturnType())
        .isEqualTo(BigDecimal.class);
    assertThat(
            ReportingUnitBlockProjection.class.getMethod("getTotalWasteVolumeM3").getReturnType())
        .isEqualTo(BigDecimal.class);
    assertThat(ReportingUnitBlockProjection.class.getMethod("getLastUpdated").getReturnType())
        .isEqualTo(LocalDateTime.class);
  }
}

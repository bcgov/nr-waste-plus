package ca.bc.gov.nrs.hrs.dto.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test | ReportingUnitSearchParametersDto")
class ReportingUnitSearchParametersDtoTest {

  // -----------------------------------------------------------------------
  // getReportingUnitIds
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("getReportingUnitIds")
  class GetReportingUnitIds {

    @Test
    @DisplayName("should return list with -1 when reportingUnitIds is null")
    void shouldReturnDefaultWhenNull() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      assertEquals(List.of(-1L), dto.getReportingUnitIds());
    }

    @Test
    @DisplayName("should return list with -1 when reportingUnitIds is empty")
    void shouldReturnDefaultWhenEmpty() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setReportingUnitIds(List.of());
      assertEquals(List.of(-1L), dto.getReportingUnitIds());
    }

    @Test
    @DisplayName("should return actual values when reportingUnitIds is populated")
    void shouldReturnActualValuesWhenPopulated() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setReportingUnitIds(List.of(100L, 200L, 300L));
      assertEquals(List.of(100L, 200L, 300L), dto.getReportingUnitIds());
    }

    @Test
    @DisplayName("should return single value list when one id is provided")
    void shouldReturnSingleValueList() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setReportingUnitIds(List.of(879L));
      assertEquals(List.of(879L), dto.getReportingUnitIds());
    }
  }

  // -----------------------------------------------------------------------
  // getDistrict
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("getDistrict")
  class GetDistrict {

    @Test
    @DisplayName("should return NOVALUE when district is null")
    void shouldReturnNoValueWhenNull() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      assertEquals(List.of(LegacyConstants.NOVALUE), dto.getDistrict());
    }

    @Test
    @DisplayName("should return NOVALUE when district is empty")
    void shouldReturnNoValueWhenEmpty() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setDistrict(List.of());
      assertEquals(List.of(LegacyConstants.NOVALUE), dto.getDistrict());
    }

    @Test
    @DisplayName("should return actual values when district is populated")
    void shouldReturnActualValues() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setDistrict(List.of("DCR", "DMH"));
      assertEquals(List.of("DCR", "DMH"), dto.getDistrict());
    }
  }

  // -----------------------------------------------------------------------
  // getSampling
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("getSampling")
  class GetSampling {

    @Test
    @DisplayName("should return NOVALUE when sampling is null")
    void shouldReturnNoValueWhenNull() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      assertEquals(List.of(LegacyConstants.NOVALUE), dto.getSampling());
    }

    @Test
    @DisplayName("should return NOVALUE when sampling is empty")
    void shouldReturnNoValueWhenEmpty() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setSampling(List.of());
      assertEquals(List.of(LegacyConstants.NOVALUE), dto.getSampling());
    }

    @Test
    @DisplayName("should return actual values when sampling is populated")
    void shouldReturnActualValues() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setSampling(List.of("S1", "S2"));
      assertEquals(List.of("S1", "S2"), dto.getSampling());
    }
  }

  // -----------------------------------------------------------------------
  // getStatus
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("getStatus")
  class GetStatus {

    @Test
    @DisplayName("should return NOVALUE when status is null")
    void shouldReturnNoValueWhenNull() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      assertEquals(List.of(LegacyConstants.NOVALUE), dto.getStatus());
    }

    @Test
    @DisplayName("should return NOVALUE when status is empty")
    void shouldReturnNoValueWhenEmpty() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setStatus(List.of());
      assertEquals(List.of(LegacyConstants.NOVALUE), dto.getStatus());
    }

    @Test
    @DisplayName("should return actual values when status is populated")
    void shouldReturnActualValues() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setStatus(List.of("AC", "IN"));
      assertEquals(List.of("AC", "IN"), dto.getStatus());
    }
  }

  // -----------------------------------------------------------------------
  // getClientNumbers
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("getClientNumbers")
  class GetClientNumbers {

    @Test
    @DisplayName("should return NOVALUE when clientNumbers is null")
    void shouldReturnNoValueWhenNull() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      assertEquals(List.of(LegacyConstants.NOVALUE), dto.getClientNumbers());
    }

    @Test
    @DisplayName("should return NOVALUE when clientNumbers is empty")
    void shouldReturnNoValueWhenEmpty() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setClientNumbers(List.of());
      assertEquals(List.of(LegacyConstants.NOVALUE), dto.getClientNumbers());
    }

    @Test
    @DisplayName("should return actual values when clientNumbers is populated")
    void shouldReturnActualValues() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setClientNumbers(List.of("00001271", "00010004"));
      assertEquals(List.of("00001271", "00010004"), dto.getClientNumbers());
    }
  }

  // -----------------------------------------------------------------------
  // getDateStart / getDateEnd
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("getDateStart and getDateEnd")
  class GetDates {

    @Test
    @DisplayName("should return NOVALUE when updateDateStart is null")
    void shouldReturnNoValueWhenDateStartIsNull() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      assertEquals(LegacyConstants.NOVALUE, dto.getDateStart());
    }

    @Test
    @DisplayName("should return formatted date when updateDateStart is set")
    void shouldReturnFormattedDateStart() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setUpdateDateStart(LocalDate.of(2025, 3, 15));
      assertEquals("2025-03-15", dto.getDateStart());
    }

    @Test
    @DisplayName("should return NOVALUE when updateDateEnd is null")
    void shouldReturnNoValueWhenDateEndIsNull() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      assertEquals(LegacyConstants.NOVALUE, dto.getDateEnd());
    }

    @Test
    @DisplayName("should return formatted date when updateDateEnd is set")
    void shouldReturnFormattedDateEnd() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      dto.setUpdateDateEnd(LocalDate.of(2025, 12, 31));
      assertEquals("2025-12-31", dto.getDateEnd());
    }
  }

  // -----------------------------------------------------------------------
  // Default values for simple fields
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("default field values")
  class DefaultFieldValues {

    @Test
    @DisplayName("should have requestByMe as false by default")
    void shouldHaveRequestByMeAsFalseByDefault() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      assertFalse(dto.isRequestByMe());
    }

    @Test
    @DisplayName("should have multiMark as false by default")
    void shouldHaveMultiMarkAsFalseByDefault() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      assertFalse(dto.isMultiMark());
    }

    @Test
    @DisplayName("should have null mainSearchTerm by default")
    void shouldHaveNullMainSearchTermByDefault() {
      ReportingUnitSearchParametersDto dto = new ReportingUnitSearchParametersDto();
      assertNull(dto.getMainSearchTerm());
    }
  }
}


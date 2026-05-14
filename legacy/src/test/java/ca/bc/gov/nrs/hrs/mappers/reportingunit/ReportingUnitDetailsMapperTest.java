package ca.bc.gov.nrs.hrs.mappers.reportingunit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitDetailsProjection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@DisplayName("Unit Test | ReportingUnitDetailsMapper")
@SpringBootTest(classes = {ReportingUnitDetailsMapperImpl.class})
@ActiveProfiles("default")
class ReportingUnitDetailsMapperTest {

  @Autowired
  private ReportingUnitDetailsMapper mapper;

  private ReportingUnitDetailsProjection projection;

  @BeforeEach
  void setUp() {
    projection = mock(ReportingUnitDetailsProjection.class);
  }

  private void stubFullProjection() {
    when(projection.getClientNumber()).thenReturn("00001271");
    when(projection.getClientLocnCode()).thenReturn("00");
    when(projection.getSamplingCode()).thenReturn("AGR");
    when(projection.getSamplingName()).thenReturn("Aggregate");
    when(projection.getDistrictCode()).thenReturn("DSS");
    when(projection.getDistrictName()).thenReturn("Skeena Stikine Natural Resource District");
  }

  // -----------------------------------------------------------------------
  // Null projection
  // -----------------------------------------------------------------------
  @Test
  @DisplayName("should return null when projection is null")
  void shouldReturnNull_whenProjectionIsNull() {
    // Act
    ReportingUnitDetailsDto dto = mapper.fromProjection(null);

    // Assert
    assertNull(dto);
  }

  // -----------------------------------------------------------------------
  // Full mapping
  // -----------------------------------------------------------------------
  @Test
  @DisplayName("should map all fields from a complete projection")
  void shouldMapAllFields_fromCompleteProjection() {
    // Arrange
    stubFullProjection();

    // Act
    ReportingUnitDetailsDto dto = mapper.fromProjection(projection);

    // Assert
    assertNotNull(dto);
    assertEquals("00001271", dto.clientNumber());
    assertEquals("00", dto.clientLocnCode());
    assertEquals("AGR", dto.sampling().code());
    assertEquals("Aggregate", dto.sampling().description());
    assertEquals("DSS", dto.district().code());
    assertEquals("Skeena Stikine", dto.district().description());
  }

  // -----------------------------------------------------------------------
  // district name cleanup
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("district name mapping")
  class DistrictNameMapping {

    @Test
    @DisplayName("should strip 'Natural Resource District' suffix from district name")
    void shouldStripNaturalResourceDistrictSuffix() {
      // Arrange
      stubFullProjection();
      when(projection.getDistrictName()).thenReturn("Campbell River Natural Resource District");

      // Act
      ReportingUnitDetailsDto dto = mapper.fromProjection(projection);

      // Assert
      assertNotNull(dto);
      assertEquals("Campbell River", dto.district().description());
    }

    @Test
    @DisplayName("should preserve district name when suffix is absent")
    void shouldPreserveDistrictName_whenSuffixAbsent() {
      // Arrange
      stubFullProjection();
      when(projection.getDistrictName()).thenReturn("Some District");

      // Act
      ReportingUnitDetailsDto dto = mapper.fromProjection(projection);

      // Assert
      assertNotNull(dto);
      assertEquals("Some District", dto.district().description());
    }

    @Test
    @DisplayName("should map district code correctly regardless of name cleanup")
    void shouldMapDistrictCode_correctly() {
      // Arrange
      stubFullProjection();
      when(projection.getDistrictCode()).thenReturn("DCR");

      // Act
      ReportingUnitDetailsDto dto = mapper.fromProjection(projection);

      // Assert
      assertNotNull(dto);
      assertEquals("DCR", dto.district().code());
    }
  }

  // -----------------------------------------------------------------------
  // sampling mapping
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("sampling mapping")
  class SamplingMapping {

    @Test
    @DisplayName("should map sampling code and name correctly for a given projection")
    void shouldMapSamplingCodeAndName_correctly() {
      // Arrange
      stubFullProjection();
      when(projection.getSamplingCode()).thenReturn("NS");
      when(projection.getSamplingName()).thenReturn("No Sampling");

      // Act
      ReportingUnitDetailsDto dto = mapper.fromProjection(projection);

      // Assert
      assertNotNull(dto);
      assertEquals("NS", dto.sampling().code());
      assertEquals("No Sampling", dto.sampling().description());
    }

    @Test
    @DisplayName("should map null sampling code as null code in nested DTO")
    void shouldMapNullSamplingCode_asNullCode() {
      // Arrange
      stubFullProjection();
      when(projection.getSamplingCode()).thenReturn(null);
      when(projection.getSamplingName()).thenReturn(null);

      // Act
      ReportingUnitDetailsDto dto = mapper.fromProjection(projection);

      // Assert
      assertNotNull(dto);
      assertNull(dto.sampling().code());
    }
  }
}


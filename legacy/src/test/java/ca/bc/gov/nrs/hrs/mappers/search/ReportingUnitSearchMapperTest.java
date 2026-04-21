package ca.bc.gov.nrs.hrs.mappers.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchProjection;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@DisplayName("Unit Test | ReportingUnitSearchMapper")
@SpringBootTest(classes = {ReportingUnitSearchMapperImpl.class})
@ActiveProfiles("default")
class ReportingUnitSearchMapperTest {

  @Autowired
  private ReportingUnitSearchMapper mapper;

  private ReportingUnitSearchProjection projection;

  @BeforeEach
  void setUp() {
    projection = mock(ReportingUnitSearchProjection.class);
  }

  private void stubFullProjection() {
    when(projection.getWasteAssessmentAreaId()).thenReturn(100L);
    when(projection.getCutBlockId()).thenReturn("BLK-1");
    when(projection.getRuNumber()).thenReturn(879L);
    when(projection.getClientNumber()).thenReturn("00001271");
    when(projection.getLicenseNumber()).thenReturn("A91320");
    when(projection.getCuttingPermit()).thenReturn("CP1");
    when(projection.getTimberMark()).thenReturn("TM001");
    when(projection.getMultiMark()).thenReturn(0);
    when(projection.getSecondaryEntry()).thenReturn(0);
    when(projection.getSamplingCode()).thenReturn("S");
    when(projection.getSamplingName()).thenReturn("Sampling");
    when(projection.getDistrictCode()).thenReturn("DCR");
    when(projection.getDistrictName()).thenReturn("Campbell River Natural Resource District");
    when(projection.getStatusCode()).thenReturn("AC");
    when(projection.getStatusName()).thenReturn("Active");
    when(projection.getLastUpdated()).thenReturn(LocalDateTime.of(2025, 1, 15, 10, 30));
  }

  // -----------------------------------------------------------------------
  // Null projection
  // -----------------------------------------------------------------------
  @Test
  @DisplayName("should return null when projection is null")
  void shouldReturnNullWhenProjectionIsNull() {
    ReportingUnitSearchResultDto dto = mapper.fromProjection(null);
    assertNull(dto);
  }

  // -----------------------------------------------------------------------
  // Full mapping
  // -----------------------------------------------------------------------
  @Test
  @DisplayName("should map all fields from a complete projection")
  void shouldMapAllFieldsFromCompleteProjection() {
    stubFullProjection();

    ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

    assertNotNull(dto);
    assertEquals(100L, dto.wasteAssessmentAreaId());
    assertEquals("BLK-1", dto.cutBlockId());
    assertEquals(879L, dto.ruNumber());
    assertEquals("00001271", dto.client().code());
    assertNull(dto.client().description());
    assertEquals("A91320", dto.licenseNumber());
    assertEquals("CP1", dto.cuttingPermit());
    assertEquals("TM001", dto.timberMark());
    assertEquals("S", dto.sampling().code());
    assertEquals("Sampling", dto.sampling().description());
    assertEquals("DCR", dto.district().code());
    assertEquals("Campbell River", dto.district().description());
    assertEquals("AC", dto.status().code());
    assertEquals("Active", dto.status().description());
    assertEquals(LocalDateTime.of(2025, 1, 15, 10, 30), dto.lastUpdated());
  }

  // -----------------------------------------------------------------------
  // bookmarked mapping
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("bookmarked mapping")
  class BookmarkedMapping {

    @Test
    @DisplayName("should always map bookmarked to false")
    void shouldAlwaysMapBookmarkedToFalse() {
      stubFullProjection();

      ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

      assertNotNull(dto);
      assertFalse(dto.bookmarked());
    }

    @Test
    @DisplayName("bookmarked should be false regardless of projection values")
    void bookmarkedShouldBeFalseRegardlessOfProjectionValues() {
      stubFullProjection();
      when(projection.getMultiMark()).thenReturn(1);
      when(projection.getSecondaryEntry()).thenReturn(1);

      ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

      assertNotNull(dto);
      assertFalse(dto.bookmarked());
    }
  }

  // -----------------------------------------------------------------------
  // multiMark mapping
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("multiMark mapping")
  class MultiMarkMapping {

    @Test
    @DisplayName("should map multiMark to true when projection value is 1")
    void shouldMapMultiMarkTrueWhenOne() {
      stubFullProjection();
      when(projection.getMultiMark()).thenReturn(1);

      ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

      assertNotNull(dto);
      assertTrue(dto.multiMark());
    }

    @Test
    @DisplayName("should map multiMark to false when projection value is 0")
    void shouldMapMultiMarkFalseWhenZero() {
      stubFullProjection();
      when(projection.getMultiMark()).thenReturn(0);

      ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

      assertNotNull(dto);
      assertFalse(dto.multiMark());
    }

    @Test
    @DisplayName("should map multiMark to false when projection value is null")
    void shouldMapMultiMarkFalseWhenNull() {
      stubFullProjection();
      when(projection.getMultiMark()).thenReturn(null);

      ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

      assertNotNull(dto);
      assertFalse(dto.multiMark());
    }
  }

  // -----------------------------------------------------------------------
  // secondaryEntry mapping
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("secondaryEntry mapping")
  class SecondaryEntryMapping {

    @Test
    @DisplayName("should map secondaryEntry to true when projection value is 1")
    void shouldMapSecondaryEntryTrueWhenOne() {
      stubFullProjection();
      when(projection.getSecondaryEntry()).thenReturn(1);

      ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

      assertNotNull(dto);
      assertTrue(dto.secondaryEntry());
    }

    @Test
    @DisplayName("should map secondaryEntry to false when projection value is 0")
    void shouldMapSecondaryEntryFalseWhenZero() {
      stubFullProjection();
      when(projection.getSecondaryEntry()).thenReturn(0);

      ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

      assertNotNull(dto);
      assertFalse(dto.secondaryEntry());
    }

    @Test
    @DisplayName("should map secondaryEntry to false when projection value is null")
    void shouldMapSecondaryEntryFalseWhenNull() {
      stubFullProjection();
      when(projection.getSecondaryEntry()).thenReturn(null);

      ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

      assertNotNull(dto);
      assertFalse(dto.secondaryEntry());
    }
  }

  // -----------------------------------------------------------------------
  // district name cleanup
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("district name mapping")
  class DistrictNameMapping {

    @Test
    @DisplayName("should strip 'Natural Resource District' from district name")
    void shouldStripNaturalResourceDistrictSuffix() {
      stubFullProjection();
      when(projection.getDistrictName()).thenReturn("Campbell River Natural Resource District");

      ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

      assertNotNull(dto);
      assertEquals("Campbell River", dto.district().description());
    }

    @Test
    @DisplayName("should handle district name without the suffix")
    void shouldHandleDistrictNameWithoutSuffix() {
      stubFullProjection();
      when(projection.getDistrictName()).thenReturn("Some District");

      ReportingUnitSearchResultDto dto = mapper.fromProjection(projection);

      assertNotNull(dto);
      assertEquals("Some District", dto.district().description());
    }
  }
}


package ca.bc.gov.nrs.hrs.mappers.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.SearchExpandedSecondaryDto;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchExpandedProjection;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@DisplayName("Unit Test | ReportingUnitSearchExpandedMapper")
@SpringBootTest(classes = {ReportingUnitSearchExpandedMapperImpl.class, ObjectMapper.class})
@ActiveProfiles("default")
class ReportingUnitSearchExpandedMapperTest {

  @Autowired
  private ReportingUnitSearchExpandedMapper mapper;

  private ReportingUnitSearchExpandedProjection projection;

  @BeforeEach
  void setUp() {
    projection = mock(ReportingUnitSearchExpandedProjection.class);
  }

  // -- Helper to set up a "complete" projection with sensible defaults --
  private void stubFullProjection() {
    when(projection.getId()).thenReturn(1L);
    when(projection.getLicenseNo()).thenReturn("L123");
    when(projection.getCuttingPermit()).thenReturn("CP1");
    when(projection.getTimberMark()).thenReturn("TM001");
    when(projection.getExempted()).thenReturn(0);
    when(projection.getMultiMark()).thenReturn(0);
    when(projection.getNetArea()).thenReturn(100.5);
    when(projection.getMarkArea()).thenReturn(50.25);
    when(projection.getSubmitter()).thenReturn("submitter");
    when(projection.getAttachmentId()).thenReturn(10L);
    when(projection.getAttachmentName()).thenReturn("doc.pdf");
    when(projection.getComments()).thenReturn("some comment");
    when(projection.getTotalBlockCount()).thenReturn(5);
    when(projection.getTotalChildCount()).thenReturn(3);
    when(projection.getSecondary()).thenReturn(null);
    when(projection.getStatusCode()).thenReturn("AC");
    when(projection.getStatusName()).thenReturn("Active");
  }

  // -----------------------------------------------------------------------
  // totalChildren tests
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("totalChildren mapping")
  class TotalChildrenMapping {

    @Test
    @DisplayName("should map totalChildCount to totalChildren when value is present")
    void shouldMapTotalChildCountWhenPresent() {
      // Given
      stubFullProjection();
      when(projection.getTotalChildCount()).thenReturn(7);

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      assertEquals(7L, dto.totalChildren());
    }

    @Test
    @DisplayName("should map totalChildren to 0 when totalChildCount is null")
    void shouldMapTotalChildrenToZeroWhenNull() {
      // Given
      stubFullProjection();
      when(projection.getTotalChildCount()).thenReturn(null);

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      assertEquals(0L, dto.totalChildren());
    }

    @Test
    @DisplayName("should map totalChildren to 0 when totalChildCount is zero")
    void shouldMapTotalChildrenWhenZero() {
      // Given
      stubFullProjection();
      when(projection.getTotalChildCount()).thenReturn(0);

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      assertEquals(0L, dto.totalChildren());
    }

    @Test
    @DisplayName("should map large totalChildCount correctly")
    void shouldMapLargeTotalChildCount() {
      // Given
      stubFullProjection();
      when(projection.getTotalChildCount()).thenReturn(999_999);

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      assertEquals(999_999L, dto.totalChildren());
    }
  }

  // -----------------------------------------------------------------------
  // parseSecondaryJson tests
  // -----------------------------------------------------------------------
  @Nested
  @DisplayName("parseSecondaryJson mapping")
  class ParseSecondaryJson {

    @Test
    @DisplayName("should return empty list when secondary JSON is null")
    void shouldReturnEmptyListWhenNull() {
      // Given
      stubFullProjection();
      when(projection.getSecondary()).thenReturn(null);

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      assertNotNull(dto.secondaryMarks());
      assertTrue(dto.secondaryMarks().isEmpty());
    }

    @Test
    @DisplayName("should return empty list when secondary JSON is blank")
    void shouldReturnEmptyListWhenBlank() {
      // Given
      stubFullProjection();
      when(projection.getSecondary()).thenReturn("   ");

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      assertNotNull(dto.secondaryMarks());
      assertTrue(dto.secondaryMarks().isEmpty());
    }

    @Test
    @DisplayName("should return empty list when secondary JSON is an empty string")
    void shouldReturnEmptyListWhenEmpty() {
      // Given
      stubFullProjection();
      when(projection.getSecondary()).thenReturn("");

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      assertNotNull(dto.secondaryMarks());
      assertTrue(dto.secondaryMarks().isEmpty());
    }

    @Test
    @DisplayName("should parse a valid single secondary mark JSON")
    void shouldParseSingleSecondaryMark() {
      // Given
      stubFullProjection();
      String json = "[{\"mark\":\"SM1\",\"status\":{\"code\":\"AC\",\"description\":\"Active\"},\"area\":10.5}]";
      when(projection.getSecondary()).thenReturn(json);

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      List<SearchExpandedSecondaryDto> marks = dto.secondaryMarks();
      assertNotNull(marks);
      assertEquals(1, marks.size());
      assertEquals("SM1", marks.get(0).mark());
      assertEquals("AC", marks.get(0).status().code());
      assertEquals("Active", marks.get(0).status().description());
      assertEquals(10.5, marks.get(0).area());
    }

    @Test
    @DisplayName("should parse multiple secondary marks from JSON")
    void shouldParseMultipleSecondaryMarks() {
      // Given
      stubFullProjection();
      String json = "["
          + "{\"mark\":\"SM1\",\"status\":{\"code\":\"AC\",\"description\":\"Active\"},\"area\":10.5},"
          + "{\"mark\":\"SM2\",\"status\":{\"code\":\"IN\",\"description\":\"Inactive\"},\"area\":20.0}"
          + "]";
      when(projection.getSecondary()).thenReturn(json);

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      List<SearchExpandedSecondaryDto> marks = dto.secondaryMarks();
      assertEquals(2, marks.size());

      assertEquals("SM1", marks.get(0).mark());
      assertEquals(10.5, marks.get(0).area());

      assertEquals("SM2", marks.get(1).mark());
      assertEquals("IN", marks.get(1).status().code());
      assertEquals(20.0, marks.get(1).area());
    }

    @Test
    @DisplayName("should return empty list when secondary JSON is invalid")
    void shouldReturnEmptyListWhenInvalidJson() {
      // Given
      stubFullProjection();
      when(projection.getSecondary()).thenReturn("{not valid json[");

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      assertNotNull(dto.secondaryMarks());
      assertTrue(dto.secondaryMarks().isEmpty());
    }

    @Test
    @DisplayName("should parse an empty JSON array to an empty list")
    void shouldParseEmptyJsonArray() {
      // Given
      stubFullProjection();
      when(projection.getSecondary()).thenReturn("[]");

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      assertNotNull(dto.secondaryMarks());
      assertTrue(dto.secondaryMarks().isEmpty());
    }

    @Test
    @DisplayName("should handle secondary mark with null optional fields")
    void shouldHandleNullOptionalFields() {
      // Given
      stubFullProjection();
      String json = "[{\"mark\":\"SM1\",\"status\":null,\"area\":null}]";
      when(projection.getSecondary()).thenReturn(json);

      // When
      ReportingUnitSearchExpandedDto dto = mapper.fromProjection(projection);

      // Then
      assertNotNull(dto);
      List<SearchExpandedSecondaryDto> marks = dto.secondaryMarks();
      assertEquals(1, marks.size());
      assertEquals("SM1", marks.get(0).mark());
      assertNull(marks.get(0).status());
      assertNull(marks.get(0).area());
    }
  }

  // -----------------------------------------------------------------------
  // Null projection test
  // -----------------------------------------------------------------------
  @Test
  @DisplayName("should return null when projection is null")
  void shouldReturnNullWhenProjectionIsNull() {
    // When
    ReportingUnitSearchExpandedDto dto = mapper.fromProjection(null);

    // Then
    assertNull(dto);
  }
}


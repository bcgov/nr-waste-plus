package ca.bc.gov.nrs.hrs.util;


import ca.bc.gov.nrs.hrs.exception.InvalidSortingFieldException;
import java.util.Map;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

@DisplayName("Unit Test | Pagination Util")
class PaginationUtilTest {

  @Test
  @DisplayName("should sort using received valid sort")
  void shouldTestResolveSort() {
    // Given
    Sort receivedSort = Sort.by("field1").ascending();
    String defaultSortField = "defaultField";
    Map<String, String> sortableFields = Map.of("field1", "field1", "field2", "field2");

    // When
    Sort result = PaginationUtil.resolveSort(receivedSort, defaultSortField, sortableFields);

    // Then
    Assertions.assertEquals(Sort.by("field1").ascending(), result);
  }

  @Test
  @DisplayName("should sort using default sort")
  void shouldTestResolveSortWithDefault() {
    // Given
    Sort receivedSort = Sort.unsorted();
    String defaultSortField = "defaultField";
    Map<String, String> sortableFields = Map.of("field1", "field1", "field2", "field2");

    // When
    Sort result = PaginationUtil.resolveSort(receivedSort, defaultSortField, sortableFields);

    // Then
    Assertions.assertEquals(Sort.by("defaultField").ascending(), result);
  }

  @Test
  @DisplayName("should sort using default when no sort was provided")
  void shouldTestResolveSortWithNull() {
    Sort result = PaginationUtil.resolveSort(
        null, "defaultField", Map.of("field1", "database_field_1"));

    Assertions.assertEquals(Sort.by("defaultField").ascending(), result);
  }

  @Test
  @DisplayName("should map multiple client sort fields and preserve their directions")
  void shouldMapMultipleSortFields() {
    Sort receivedSort = Sort.by(
        Sort.Order.desc("field1"), Sort.Order.asc("field2"));

    Sort result = PaginationUtil.resolveSort(
        receivedSort,
        "defaultField",
        Map.of("field1", "database_field_1", "field2", "database_field_2"));

    Assertions.assertEquals(
        Sort.by(
            Sort.Order.desc("database_field_1"), Sort.Order.asc("database_field_2")),
        result);
  }

  @Test
  @DisplayName("should throw exception when invalid field is used")
  void shouldTestResolveSortWithInvalidField() {
    // Given
    Sort receivedSort = Sort.by("invalidField").ascending();
    String defaultSortField = "defaultField";
    Map<String, String> sortableFields = Map.of("field1", "field1", "field2", "field2");

    // When
    Assertions.assertThrows(InvalidSortingFieldException.class, () -> {
      PaginationUtil.resolveSort(receivedSort, defaultSortField, sortableFields);
    });
  }
}

package ca.bc.gov.nrs.hrs.util;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;

import java.util.List;
import java.util.stream.Stream;
import org.assertj.core.api.MapAssert;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Sort.Direction;
import org.testcontainers.shaded.org.checkerframework.checker.signature.qual.MethodDescriptor;

@DisplayName("Unit Test | UriUtils")
class UriUtilsTest {

  @ParameterizedTest
  @MethodSource("buildMultiValueQueryParam")
  @DisplayName("building multi value map")
  void shouldBuildMultiValue(List<String> values, List<String> results) {
    MapAssert<String, List<String>> assertion = assertThat(UriUtils.buildMultiValueQueryParam("test", values))
        .isNotNull();

    if (results == null || results.isEmpty()) {
      assertion.isEmpty();
    } else {
      assertion
          .isNotEmpty()
          .hasSize(1)
          .hasFieldOrPropertyWithValue("test",results);

    }

  }

  @ParameterizedTest
  @MethodSource("buildPageableQueryParam")
  @DisplayName("building pageable map")
  void shouldBuildPageable(
      Pageable page, boolean isEmpty, int size, int pageNumber, String sort
  ) {
    MapAssert<String, List<String>> assertion = assertThat(UriUtils.buildPageableQueryParam(page))
        .isNotNull();

    if (isEmpty) {
      assertion.isEmpty();
    } else {
      assertion
          .isNotEmpty()
          .hasSize(sort == null || sort.isBlank() ? 2 : 3)
          .hasFieldOrPropertyWithValue("size",List.of(String.valueOf(size)))
          .hasFieldOrPropertyWithValue("page",List.of(String.valueOf(pageNumber)));

      if (sort != null && !sort.isBlank()) {
        assertion.hasFieldOrPropertyWithValue("sort",List.of(sort));
      }
    }

  }

  private static Stream<Arguments> buildMultiValueQueryParam(){
    return
        Stream.of(
            Arguments.argumentSet(
                "Null values",
                null,List.of()
            ),
            Arguments.argumentSet(
                "Empty values",
                List.of(),List.of()
            ),
            Arguments.argumentSet(
                "Empty values on list",
                List.of("james", "john","","don"),List.of("james", "john","don")
            ),
            Arguments.argumentSet(
                "Values on list",
                List.of("james", "john","don"),List.of("james", "john","don")
            )
        );
  }

  private static Stream<Arguments> buildPageableQueryParam() {
    return
        Stream.of(
            Arguments.argumentSet(
                "Null values",
                null,
                true, 0, 0, ""
            ),
            Arguments.argumentSet(
                "Empty values",
                PageRequest.ofSize(10),
                false, 10, 0, ""
            ),
            Arguments.argumentSet(
                "No sort",
                PageRequest.of(3, 12),
                false, 12, 3, ""
            ),
            Arguments.argumentSet(
                "Sort",
                PageRequest.of(0, 10, Direction.DESC,"name"),
                false, 10, 0, "name,DESC"
            ),
            Arguments.argumentSet(
                "Sort",
                PageRequest.of(0,10, Sort.by(Direction.DESC,"name")),
                false, 10, 0, "name,DESC"
            )

        );
  }

}

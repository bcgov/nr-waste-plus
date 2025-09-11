package ca.bc.gov.nrs.hrs.util;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;

import java.util.List;
import java.util.stream.Stream;
import org.assertj.core.api.MapAssert;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

@DisplayName("Unit Test | UriUtils")
class UriUtilsTest {

  @ParameterizedTest
  @MethodSource("buildMultiValueQueryParam")
  @DisplayName("building multi value map")
  void shouldBuildMultiValue(List<String> values, List<String> results) {
    MapAssert<String, List<String>> assertion = assertThat(UriUtils.buildMultiValueQueryParam("test", values))
        .isNotNull();

    if(results == null || results.isEmpty()){
      assertion.isEmpty();
    } else {
      assertion
          .isNotEmpty()
          .hasSize(1)
          .hasFieldOrPropertyWithValue("test",results);

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

}
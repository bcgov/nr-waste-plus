package ca.bc.gov.nrs.hrs.mappers;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class AbstractMutualMapperTest {

  private final AbstractMutualMapper<String, String> mapper =
      new AbstractMutualMapper<>() {
        @Override
        public String toDto(String entity) {
          return entity;
        }

        @Override
        public String toEntity(String dto) {
          return dto;
        }
      };

  @Test
  void limitsLongUserIdsAndPreservesShortUserIds() {
    String thirtyCharacters = "123456789012345678901234567890";

    assertThat(mapper.limitUserId(thirtyCharacters)).isEqualTo(thirtyCharacters);
    assertThat(mapper.limitUserId(thirtyCharacters + "extra")).isEqualTo(thirtyCharacters);
  }

  @Test
  void convertsBlankStringsToSpaceAndPreservesNonBlankStrings() {
    assertThat(mapper.defaultEmptySpace(null)).isEqualTo(" ");
    assertThat(mapper.defaultEmptySpace(" \t")).isEqualTo(" ");
    assertThat(mapper.defaultEmptySpace("value")).isEqualTo("value");
    assertThat(mapper.defaultEmptySpaceAlways("ignored")).isEqualTo(" ");
  }

  @Test
  void setsRevisionOnlyWhenNoLongRevisionExists() {
    assertThat(mapper.initialRevision(null)).isEqualTo(1L);
    assertThat(mapper.initialRevision(4)).isEqualTo(1L);
    assertThat(mapper.initialRevision(7L)).isEqualTo(7L);
  }

  @Test
  void convertsDatesAndPreservesNulls() {
    LocalDate date = LocalDate.of(2026, 11, 12);
    LocalDateTime dateTime = date.atTime(13, 45);

    assertThat(mapper.toLocalDate(dateTime)).isEqualTo(date);
    assertThat(mapper.toLocalDate(null)).isNull();
    assertThat(mapper.toLocalDateTime(date)).isEqualTo(date.atStartOfDay());
    assertThat(mapper.toLocalDateTime(null)).isNull();
  }

  @Test
  void wrapsValuesInListsAndReturnsEmptyListForNull() {
    assertThat(mapper.addToList("client")).isEqualTo(List.of("client"));
    assertThat(mapper.addToList(null)).isEmpty();
  }

  @Test
  void providesCurrentAndMaximumDateTimes() {
    LocalDateTime before = LocalDateTime.now();

    LocalDateTime current = mapper.currentDateTime("ignored");

    assertThat(current).isBetween(before, LocalDateTime.now());
    assertThat(mapper.maxDateTime("ignored")).isEqualTo(LocalDateTime.MAX);
  }
}

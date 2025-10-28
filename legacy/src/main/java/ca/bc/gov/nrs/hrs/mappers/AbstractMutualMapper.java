package ca.bc.gov.nrs.hrs.mappers;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import org.apache.commons.lang3.StringUtils;
import org.mapstruct.InheritInverseConfiguration;
import org.mapstruct.Named;

/**
 * Common MapStruct mapper contract and shared mapping qualifiers used across the project.
 *
 * <p>Implementations of this interface provide two-way mappings between DTOs and entities
 * (via {@link #toDto(Object)} and {@link #toEntity(Object)}). In addition this interface exposes a
 * set of {@link Named} helper methods (qualifiers) that can be referenced from MapStruct mapping
 * definitions to apply small transformations such as trimming a user id to a maximum length,
 * providing default values, or converting between {@link LocalDate} and {@link LocalDateTime}.</p>
 *
 * <p>Qualifiers are intentionally small and side-effect free so they can be reused across
 * different mapping contexts.</p>
 */
public interface AbstractMutualMapper<D, E> {

  /**
   * Convert the supplied entity instance to its corresponding DTO representation.
   *
   * @param entity the source entity to convert
   * @return the mapped DTO instance
   */
  D toDto(E entity);

  /**
   * Convert the supplied DTO instance to its corresponding entity representation.
   *
   * <p>The method is annotated with {@link InheritInverseConfiguration} so that MapStruct
   * can reuse the inverse of the {@link #toDto(Object)} mapping.</p>
   *
   * @param dto the source DTO to convert
   * @return the mapped entity instance
   */
  @InheritInverseConfiguration
  E toEntity(D dto);

  /**
   * Qualifier that limits a user id string to 30 characters.
   *
   * <p>MapStruct mappings can reference this qualifier as
   * {@code qualifiedByName = "UserIdSizeQualifier"}.
   * The method preserves the original value when shorter than or equal to 30 characters. Note: the
   * original value is assumed to be non-null in existing mappings.</p>
   *
   * @param origin the input user id string
   * @return the truncated or original user id string
   */
  @Named("UserIdSizeQualifier")
  default String limitUserId(String origin) {
    return origin.length() > 30 ? origin.substring(0, 30) : origin;
  }

  /**
   * Qualifier that replaces blank or null strings with a single space.
   *
   * <p>Useful for legacy DB columns that expect a non-empty value; this returns a single
   * space when the input is blank according to {@link StringUtils#isBlank(CharSequence)}.</p>
   *
   * @param origin the input string
   * @return the original string when non-blank, otherwise a single space
   */
  @Named("EmptySpaceQualifier")
  default String defaultEmptySpace(String origin) {
    return StringUtils.isBlank(origin) ? " " : origin;
  }

  /**
   * Qualifier that always returns a single space regardless of the input.
   *
   * <p>Provided for mappings that require a constant non-empty value for certain DB columns.</p>
   *
   * @param origin ignored input value
   * @return a single space string
   */
  @Named("AlwaysEmptySpaceQualifier")
  default String defaultEmptySpaceAlways(Object origin) {
    return " ";
  }

  /**
   * Qualifier that returns the current date/time.
   *
   * <p>Used to populate timestamp columns during mappings; the input parameter is ignored.</p>
   *
   * @param origin ignored input value
   * @return the current {@link LocalDateTime}
   */
  @Named("CurrentDateTimeQualifier")
  default LocalDateTime currentDateTime(Object origin) {
    return LocalDateTime.now();
  }

  /**
   * Qualifier that returns an initial revision value.
   *
   * <p>If the supplied value is null or not a {@link Long} this returns {@code 1L}, otherwise
   * it returns the supplied {@code Long} value.</p>
   *
   * @param value the existing revision value or null
   * @return the initial or supplied revision value
   */
  @Named("InitialRevisionQualifier")
  default Long initialRevision(Object value) {
    return Objects.isNull(value) || !(value instanceof Long) ? 1L : (Long) value;
  }

  /**
   * Qualifier that converts a {@link LocalDateTime} to a {@link LocalDate}.
   *
   * @param date the source {@link LocalDateTime}
   * @return the corresponding {@link LocalDate} or {@code null} when the input is {@code null}
   */
  @Named("LocalDateTimeDateQualifier")
  default LocalDate toLocalDate(LocalDateTime date) {
    return date == null ? null : date.toLocalDate();
  }

  /**
   * Qualifier that converts a {@link LocalDate} to a {@link LocalDateTime} at the start of day.
   *
   * @param date the source {@link LocalDate}
   * @return the corresponding {@link LocalDateTime} at start of day or {@code null} when the input
   *        is {@code null}
   */
  @Named("LocalDateDateTimeQualifier")
  default LocalDateTime toLocalDateTime(LocalDate date) {
    return date == null ? null : date.atStartOfDay();
  }

  /**
   * Qualifier that wraps a single value into an immutable list (or returns an empty list when
   * null).
   *
   * <p>MapStruct mappings can use this to assign single string values into collection
   * properties.</p>
   *
   * @param value the single string value
   * @return a singleton list containing {@code value} or an empty list when {@code value} is
   *        {@code null}
   */
  @Named("AddToListQualifier")
  default List<String> addToList(String value) {
    return value != null ? List.of(value) : List.of();
  }

  /**
   * Qualifier that returns the maximum {@link LocalDateTime} value.
   *
   * <p>Useful for creating a far-future upper bound when mapping query parameters.</p>
   *
   * @param origin ignored input
   * @return {@link LocalDateTime#MAX}
   */
  @Named("MaxDateTimeQualifier")
  default LocalDateTime maxDateTime(Object origin) {
    return LocalDateTime.MAX;
  }

}

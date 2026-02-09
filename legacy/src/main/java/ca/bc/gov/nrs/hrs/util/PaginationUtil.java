package ca.bc.gov.nrs.hrs.util;

import ca.bc.gov.nrs.hrs.exception.InvalidSortingFieldException;
import java.util.Map;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.domain.Sort.Order;
import org.springframework.data.jpa.domain.JpaSort;

/**
 * Utility methods for resolving pagination and sorting parameters.
 *
 * <p>The helper converts incoming Spring {@link Sort} definitions into database field-backed
 * {@link Sort} instances using a mapping of client-visible property names to actual DB column
 * names. When an unknown sort field is requested, an {@link InvalidSortingFieldException} is
 * thrown.</p>
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class PaginationUtil {

  /**
   * Resolve an incoming Sort into a DB field-aware {@link Sort} using the provided mapping.
   *
   * <p>If {@code receivedSort} is null or unsorted the {@code defaultSortField} is used as an
   * ascending order. Otherwise each requested order is mapped via {@code sortableFields} from
   * client property names to actual DB fields; an {@link InvalidSortingFieldException} is thrown
   * when a property cannot be resolved.</p>
   *
   * @param receivedSort     the incoming Spring {@link Sort} from the controller layer
   * @param defaultSortField the DB-default field to sort by when no sort is supplied
   * @param sortableFields   mapping of client property -> DB field name
   * @return a {@link Sort} instance ordered by DB fields
   */
  public static JpaSort resolveSort(
      Sort receivedSort,
      String defaultSortField,
      Map<String, String> sortableFields
  ) {
    if (receivedSort == null || receivedSort.isUnsorted()) {
      return JpaSort.unsafe(Direction.ASC, defaultSortField);
    }

    JpaSort sort = null;

    for (Order order : receivedSort) {
      String dbField = sortableFields.get(order.getProperty());
      if (dbField == null) {
        throw new InvalidSortingFieldException(order.getProperty());
      }
      sort = sort != null ?
          sort.andUnsafe(order.getDirection(), dbField)
          : JpaSort.unsafe(order.getDirection(), dbField);
    }

    return sort != null ? sort : JpaSort.unsafe(Direction.ASC, defaultSortField);
  }

}

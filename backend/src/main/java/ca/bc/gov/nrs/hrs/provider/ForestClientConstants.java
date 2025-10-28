package ca.bc.gov.nrs.hrs.provider;

import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientLocationDto;
import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Constants for {@link ForestClientApiProvider} fallback responses.
 *
 * <p>
 * Centralizes empty/static return values used by fallback methods so they can
 * be reused and tested more easily.
 * </p>
 */
@SuppressWarnings("unused")
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ForestClientConstants {

  public static final List<ForestClientDto> EMPTY_FOREST_CLIENT_LIST = List.of();
  public static final List<ForestClientLocationDto> EMPTY_FOREST_CLIENT_LOCATION_LIST = List.of();
}


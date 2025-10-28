package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientAutocompleteResultDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.provider.ForestClientApiProvider;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

/**
 * Service containing helpers that interact with the Forest Client API via
 * {@link ForestClientApiProvider}.
 *
 * <p>Provides convenience methods used by controllers to fetch client details,
 * locations and to perform searches. Input normalization (client number
 * formatting) is applied where needed.
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class ForestClientService {

  private final ForestClientApiProvider forestClientApiProvider;

  /**
   * Get a {@link ForestClientDto} given a client number.
   *
   * @param clientNumber The client number to be fetched.
   * @return Optional of {@link ForestClientDto}
   */
  @NewSpan
  public Optional<ForestClientDto> getClientByNumber(String clientNumber) {
    String fixedNumber = checkClientNumber(clientNumber);

    log.info("Received client number to fetch {}", fixedNumber);

    return forestClientApiProvider.fetchClientByNumber(fixedNumber);
  }

  /**
   * Search for clients by name, acronym or number.
   *
   * @param page The page number to be fetched.
   * @param size The size of the page to be fetched.
   * @param value The value to be searched.
   * @param clients optional client number filter; when empty, no filtering is applied
   * @return List of {@link ForestClientAutocompleteResultDto} with found clients.
   */
  @NewSpan
  public List<ForestClientAutocompleteResultDto> searchClients(
      int page,
      int size,
      String value,
      List<String> clients
  ) {
    log.info("Searching forest client by {} as name, acronym or number with page {} and size {}",
        value, page, size);
    return forestClientApiProvider
        .searchClients(page, size, value)
        .stream()
        // #128 filter out clients if list is provided
        .filter(client ->
                clients.isEmpty() || clients.contains(client.clientNumber())
            )
        .map(client -> new ForestClientAutocompleteResultDto(
                client.clientNumber(),
                client.name(),
                client.acronym()
            )
        )
        .toList();
  }

  /**
   * Get the locations of a client.
   *
   * @param clientNumber The client number to be fetched.
   * @return List of {@link CodeDescriptionDto} with found locations.
   */
  @NewSpan
  public List<CodeDescriptionDto> getClientLocations(String clientNumber) {
    String fixedNumber = checkClientNumber(clientNumber);

    log.info("Fetching locations for client number {}", fixedNumber);

    return
        forestClientApiProvider
            .fetchLocationsByClientNumber(fixedNumber)
            .stream()
            .map(location -> new CodeDescriptionDto(
                location.locationCode(),
                Objects.toString(location.locationName(), "No name provided")
            ))
            .toList();
  }

  /**
   * Search clients by explicit list of client numbers.
   *
   * @param page page index
   * @param size page size
   * @param values list of client numbers
   * @param name optional name filter
   * @return list of matching {@link ForestClientDto}
   */
  @NewSpan
  public List<ForestClientDto> searchByClientNumbers(
      int page,
      int size,
      List<String> values,
      String name
  ) {
    log.info("Searching forest client by ids {}, page: {}, size: {}", values, page, size);
    return forestClientApiProvider.searchClientsByIds(page, size, values, name);
  }

  private String checkClientNumber(String clientNumber) {
    if (StringUtils.isEmpty(clientNumber)) {
      return "00000000";
    }

    try {
      Integer parsed = Integer.parseInt(clientNumber);
      return String.format("%08d", parsed);
    } catch (NumberFormatException nfe) {
      return "00000000";
    }
  }
}

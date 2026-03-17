package ca.bc.gov.nrs.hrs.provider.forestclient;

import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

/**
 * Facade provider for calls to the ForestClient API.
 *
 * <p>
 * This class keeps a stable API for service-layer callers while delegating to
 * smaller, capability-focused clients:
 * {@link ForestClientFetchClient} and {@link ForestClientSearchClient}.
 * </p>
 */
@Component
@Observed
@RequiredArgsConstructor
public class ForestClientApiProvider {

  private final ForestClientFetchClient fetchClient;
  private final ForestClientSearchClient searchClient;

  /**
   * Fetch a ForestClient by its number.
   *
   * @param number the client number to search for
   * @return an {@link Optional} containing the {@link ForestClientDto} if found
   */
  public Optional<ForestClientDto> fetchClientByNumber(String number) {
    return fetchClient.fetchClientByNumber(number);
  }

  /**
   * Search client by name, acronym or number.
   *
   * @param page  pagination page
   * @param size  pagination size
   * @param value search value for name/acronym/number
   * @return a {@link Page} of {@link ForestClientDto}
   */
  public Page<ForestClientDto> searchClients(int page, int size, String value) {
    return searchClient.searchClients(page, size, value);
  }

  /**
   * Search clients by a list of IDs with optional name filter.
   *
   * @param page   Page number
   * @param size   Number of items per page
   * @param values List of client IDs to search
   * @param name   Optional name filter
   * @return List of matching ForestClientDto
   */
  public List<ForestClientDto> searchClientsByIds(
      int page,
      int size,
      List<String> values,
      String name
  ) {
    return searchClient.searchClientsByIds(page, size, values, name);
  }
}


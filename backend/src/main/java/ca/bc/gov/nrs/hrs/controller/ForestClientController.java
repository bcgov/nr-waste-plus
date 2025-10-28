package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientAutocompleteResultDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.dto.search.MyForestClientSearchResultDto;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;
import ca.bc.gov.nrs.hrs.service.ForestClientService;
import ca.bc.gov.nrs.hrs.service.SearchService;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.AllArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller exposing endpoints to query and search Forest Client data.
 *
 * <p>
 * Provides operations to retrieve a single forest client by client number,
 * search for clients by name, acronym or number, retrieve client locations,
 * look up multiple clients by numbers, and perform paged searches for the
 * currently authenticated user's associated forest clients.
 * </p>
 *
 * <p>
 * This controller relies on {@link ForestClientService} for client-related
 * data access and {@link SearchService} for the paged "my forest clients"
 * search. Authentication information is read from the JWT principal (when
 * available) using {@link JwtPrincipalUtil} to apply identity-provider-specific
 * behavior (for example BCEID vs IDIR filtering).
 * </p>
 */
@RestController
@RequestMapping("/api/forest-clients")
@AllArgsConstructor
@Observed
public class ForestClientController {

  private final ForestClientService forestClientService;
  private final SearchService searchService;

  /**
   * Get a {@link ForestClientDto} given a client number.
   *
   * @param clientNumber the client number to be fetched
   * @return the {@link ForestClientDto} for the given client number
   * @throws ForestClientNotFoundException when the client with the provided
   *     number is not found
   */
  @GetMapping("/{clientNumber}")
  public ForestClientDto getForestClient(@PathVariable String clientNumber) {
    return forestClientService
        .getClientByNumber(clientNumber)
        .orElseThrow(ForestClientNotFoundException::new);
  }

  /**
   * Search for clients by name, acronym or number.
   *
   * <p>
   * The behavior of this endpoint is affected by the caller's identity
   * provider (determined from the provided JWT):
   * </p>
   *
   * <ul>
   *   <li>BCeID callers will have the result size increased to allow client-side
   *       filtering and will only be allowed to search if they have clients in
   *       their roles.</li>
   *   <li>IDIR callers will search without client-based restrictions.</li>
   * </ul>
   *
   * @param page the page index to fetch (zero-based)
   * @param size the page size to fetch
   * @param value the search value (name, acronym or number)
   * @param jwt the JWT principal of the authenticated caller (injected by
   *     Spring Security)
   * @return a list of {@link ForestClientAutocompleteResultDto} matching the
   *     search criteria
   */
  @GetMapping("/byNameAcronymNumber")
  public List<ForestClientAutocompleteResultDto> searchForestClients(
      @RequestParam(value = "page", required = false, defaultValue = "0") Integer page,
      @RequestParam(value = "size", required = false, defaultValue = "10") Integer size,
      @RequestParam(value = "value") String value,
      @AuthenticationPrincipal Jwt jwt
  ) {

    List<String> clientsFromRoles = JwtPrincipalUtil.getClientFromRoles(jwt);

    // #128: BCeID should filter out on client side, we increase the size to get more results.
    if (JwtPrincipalUtil.getIdentityProvider(jwt).equals(IdentityProvider.BUSINESS_BCEID)) {
      if (clientsFromRoles.isEmpty()) {
        return List.of(); // Abstract with no roles should not search
      }
      // #128: Increased to 100, so we can filter down on our side.
      size = 100;
    }

    // #128 IDIR users should search unrestricted. Abstract filter out based on clients on role
    List<String> clients = JwtPrincipalUtil.getIdentityProvider(jwt).equals(IdentityProvider.IDIR)
        ? List.of()
        : clientsFromRoles;

    return forestClientService.searchClients(page, size, value, clients);
  }

  /**
   * Get the locations of a client.
   *
   * @param clientNumber the client number to be fetched
   * @return a list of {@link CodeDescriptionDto} representing the client's
   *     locations
   */
  @GetMapping("/{clientNumber}/locations")
  public List<CodeDescriptionDto> getForestClientLocations(@PathVariable String clientNumber) {
    return forestClientService.getClientLocations(clientNumber);
  }

  /**
   * Search for clients by a list of client numbers.
   *
   * @param page the page index to fetch (zero-based)
   * @param size the page size to fetch
   * @param values the list of client numbers to look up
   * @return a list of {@link ForestClientDto} for the matching client numbers
   */
  @GetMapping("/searchByNumbers")
  public List<ForestClientDto> searchByClientNumbers(
      @RequestParam(value = "page", required = false, defaultValue = "0") Integer page,
      @RequestParam(value = "size", required = false, defaultValue = "10") Integer size,
      @RequestParam(value = "values") List<String> values) {
    return forestClientService.searchByClientNumbers(page, size, values, null);
  }

  /**
   * Search page of the current user's Forest clients.
   *
   * <p>
   * This endpoint performs a paged search scoped to the clients associated
   * with the authenticated user's roles (as extracted from the JWT). The
   * pageable default sorts by {@code lastUpdate} in descending order.
   * </p>
   *
   * @param value optional free-text search value; defaults to an empty string
   * @param pageable the pageable specification (page number, size, sort)
   * @param jwt the JWT principal used to determine the caller's client roles
   * @return a {@link Page} of {@link MyForestClientSearchResultDto} matching
   *     the search and client-role restrictions
   */
  @GetMapping("/clients")
  public Page<MyForestClientSearchResultDto> searchMyForestClients(
      @RequestParam(required = false, defaultValue = StringUtils.EMPTY) String value,
      @PageableDefault(sort = "lastUpdate", direction = Direction.DESC)
      Pageable pageable,
      @AuthenticationPrincipal Jwt jwt
  ) {
    return searchService.searchByMyForestClient(pageable, value,
        JwtPrincipalUtil.getClientFromRoles(jwt));
  }

}

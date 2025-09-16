package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.BackendConstants;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientAutocompleteResultDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.service.ForestClientService;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;

/**
 * This class holds resources for the Forest Client API interaction.
 */
@RestController
@RequestMapping("/api/forest-clients")
@AllArgsConstructor
@Observed
public class ForestClientController {

  private final ForestClientService forestClientService;

  /**
   * Get a {@link ForestClientDto} given a client number.
   *
   * @param clientNumber The client number to be fetched.
   * @return ForestsClientDto
   * @throws ForestClientNotFoundException when client not found
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
   * @param page  The page number to be fetched.
   * @param size  The size of the page to be fetched.
   * @param value The value to be searched.
   * @return List of {@link ForestClientAutocompleteResultDto} with found clients.
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
      if (clientsFromRoles.isEmpty())
        return List.of(); // Abstract with no roles should not search
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
   * @param clientNumber The client number to be fetched.
   * @return List of {@link CodeDescriptionDto} with found locations.
   */
  @GetMapping("/{clientNumber}/locations")
  public List<CodeDescriptionDto> getForestClientLocations(@PathVariable String clientNumber) {
    return forestClientService.getClientLocations(clientNumber);
  }

  @GetMapping("/searchByNumbers")
  public List<ForestClientDto> searchByClientNumbers(
      @RequestParam(value = "page", required = false, defaultValue = "0") Integer page,
      @RequestParam(value = "size", required = false, defaultValue = "10") Integer size,
      @RequestParam(value = "values") List<String> values) {
    return forestClientService.searchByClientNumbers(page, size, values);
  }

}

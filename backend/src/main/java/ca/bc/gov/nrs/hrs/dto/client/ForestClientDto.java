package ca.bc.gov.nrs.hrs.dto.client;

import com.fasterxml.jackson.annotation.JsonGetter;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.Builder;
import lombok.With;

/**
 * This record represents a Forest Client object.
 *
 * <p>It models information about a forest client including identification,
 * legal person names and type/status codes. The {@link #name()} accessor resolves a display name
 * depending on whether the client represents an individual or an organization.
 * </p>
 */
@Builder
@With
public record ForestClientDto(
    String clientNumber,
    String clientName,
    String legalFirstName,
    String legalMiddleName,
    ForestClientStatusEnum clientStatusCode,
    ForestClientTypeEnum clientTypeCode,
    String acronym
) {

  /**
   * Returns the name of the client.
   *
   * <p>The value is resolved based on the client type: for individuals (type code 'I')
   * it concatenates legal first, middle and last name parts; for other types it returns the
   * clientName (company or organization name).
   * </p>
   *
   * @return the resolved display name of the client
   */
  @JsonGetter
  public String name() {
    if (Objects.equals(this.clientTypeCode, ForestClientTypeEnum.of('I'))) {
      return Stream.of(this.legalFirstName, this.legalMiddleName, this.clientName)
          .filter(Objects::nonNull)
          .map(String::trim)
          .collect(Collectors.joining(" "));
    } else {
      return this.clientName;
    }
  }

}

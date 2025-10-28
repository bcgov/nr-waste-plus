package ca.bc.gov.nrs.hrs.dto.client;

import java.time.LocalDate;
import lombok.With;

/**
 * This record represents a Forest Client Location object.
 *
 * <p>
 * It contains contact and addressing information for a single client
 * location together with metadata such as whether the location is expired or
 * trusted and the last returned-mail date.
 * </p>
 *
 * @param clientNumber the parent client number
 * @param locationCode the code identifying this location
 * @param locationName the human-readable name of the location
 * @param companyCode optional company code associated with the location
 * @param address1 primary street address line
 * @param address2 secondary street address line
 * @param address3 tertiary street address line
 * @param city city name
 * @param province province or state
 * @param postalCode postal or ZIP code
 * @param country country name
 * @param businessPhone business phone number
 * @param homePhone home phone number
 * @param cellPhone cell/mobile phone number
 * @param faxNumber fax number
 * @param email contact email address
 * @param expired indicates if the location is expired (see {@link YesNoEnum})
 * @param trusted indicates if the location is trusted (see {@link YesNoEnum})
 * @param returnedMailDate date of last returned mail for the location
 * @param comment optional free-text comment about the location
 */
@With
public record ForestClientLocationDto(
    String clientNumber,
    String locationCode,
    String locationName,
    String companyCode,
    String address1,
    String address2,
    String address3,
    String city,
    String province,
    String postalCode,
    String country,
    String businessPhone,
    String homePhone,
    String cellPhone,
    String faxNumber,
    String email,
    YesNoEnum expired,
    YesNoEnum trusted,
    LocalDate returnedMailDate,
    String comment
) {

}

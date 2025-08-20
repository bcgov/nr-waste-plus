package ca.bc.gov.nrs.hrs.provider;

import ca.bc.gov.nrs.hrs.dto.CodeNameDto;
import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class ForestClientApiProviderTestConstants {

  public static final String TWO_LOCATIONS_LIST = """
      [
        {
          "locationCode": "00",
          "locationName": "Location 1"
        },
        {
          "locationCode": "01",
          "locationName": "Location 2"
        }
      ]""";

  public static final String ONE_BY_VALUE_LIST = """
      [
        {
          "clientNumber": "00012797",
          "clientName": "MINISTRY OF FORESTS",
          "legalFirstName": null,
          "legalMiddleName": null,
          "clientStatusCode": "ACT",
          "clientTypeCode": "F",
          "acronym": "MOF"
        }
      ]
      """;

  public static final String CLIENTNUMBER_RESPONSE = """
      {
        "clientNumber": "00012797",
        "clientName": "MINISTRY OF FORESTS",
        "legalFirstName": null,
        "legalMiddleName": null,
        "clientStatusCode": "ACT",
        "clientTypeCode": "F",
        "acronym": "MOF"
      }
      """;

  public static final String DISTRICT_CODES_JSON = """
      [
        { "code": "DMH", "name": "100 Mile House Natural Resource District" },
        { "code": "DCC", "name": "Cariboo-Chilcotin Natural Resource District" },
        { "code": "DCK", "name": "Chilliwack Natural Resource District" },
        { "code": "DFN", "name": "Fort Nelson Natural Resource District" },
        { "code": "DQC", "name": "Haida Gwaii Natural Resource District" },
        { "code": "DMK", "name": "Mackenzie Natural Resource District" },
        { "code": "DND", "name": "Nadina Natural Resource District" },
        { "code": "DNI", "name": "North Island - Central Coast Natural Resource District" },
        { "code": "DPC", "name": "Peace Natural Resource District" },
        { "code": "DPG", "name": "Prince George Natural Resource District" },
        { "code": "DQU", "name": "Quesnel Natural Resource District" },
        { "code": "DRM", "name": "Rocky Mountain Natural Resource District" },
        { "code": "DSQ", "name": "Sea to Sky Natural Resource District" },
        { "code": "DSE", "name": "Selkirk Natural Resource District" },
        { "code": "DSS", "name": "Skeena Stikine Natural Resource District" },
        { "code": "DSI", "name": "South Island Natural Resource District" },
        { "code": "DVA", "name": "Stuart Nechako Natural Resource District" },
        { "code": "DSC", "name": "Sunshine Coast Natural Resource District" },
        { "code": "DKA", "name": "Thompson Rivers Natural Resource District" },
        { "code": "DKM", "name": "Coast Mountains Natural Resource District" },
        { "code": "DOS", "name": "Okanagan Shuswap Natural Resource District" },
        { "code": "DCS", "name": "Cascades Natural Resource District" },
        { "code": "DCR", "name": "Campbell River Natural Resource District" }
      ]
      """;
}

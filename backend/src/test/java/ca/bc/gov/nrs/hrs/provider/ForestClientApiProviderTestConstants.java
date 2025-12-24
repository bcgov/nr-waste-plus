package ca.bc.gov.nrs.hrs.provider;

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

  public static final String REPORTING_UNITS_SEARCH_RESPONSE = """
      {
           "content": [
               {
                   "blockId": "26",
                   "ruNumber": 36834,
                   "client": {
                       "code": "00010002",
                       "description": null
                   },
                   "licenseNumber": "C-12345",
                   "cuttingPermit": "A12345",
                   "timberMark": "TM12345",
                   "multiMark": false,
                   "sampling": {
                       "code": "BLK",
                       "description": "Cutblock"
                   },
                   "district": {
                       "code": "DND",
                       "description": "Nadina Natural Resource District"
                   },
                   "status": {
                       "code": "DFT",
                       "description": "Draft"
                   },
                   "lastUpdated": "2025-08-24T09:10:28"
               }
           ],
           "page": {
               "size": 10,
               "number": 0,
               "totalElements": 1,
               "totalPages": 1
           }
       }""";

  public static final String REPORTING_UNITS_EMPTY_SEARCH_RESPONSE = """
      {
        "content": [],
        "page": {
            "size": 10,
            "number": 0,
            "totalElements": 0,
            "totalPages": 0
        }
      }""";

  public static final String CLIENT_00010002 = """
      {
        "clientNumber": "00010002",
        "clientName": "WEST FRASER MILLS LTD",
        "legalFirstName": null,
        "legalMiddleName": null,
        "clientStatusCode": "ACT",
        "clientTypeCode": "F",
        "acronym": "WFM"
      }""";

  public static final String CLIENT_LOCATION_00010002 = """
      [
        {
          "locationCode": "00",
          "locationName": "Head Office"
        },
        {
          "locationCode": "03",
          "locationName": "Vanderhoof"
        }
      ]""";

  public static final String MY_FOREST_CLIENTS_LEGACY = """
      {
        "content": [{
            "client": {
                "code": "00012797",
                "description": null
            },
            "submissionsCount": 2,
            "blocksCount": 2,
            "lastUpdate": "2024-08-20T14:22:31"
        }],
        "page": {
            "size": 10,
            "number": 0,
            "totalElements": 0,
            "totalPages": 0
        }
      }""";

  public static final String EMPTY_JSON = "{}";
  public static final String EMPTY_PAGED_NOPAGE = """
      {
        "content": []
      }""";

  public static final String REPORTING_UNIT_EXPANDED_FULL = """
      {
        "id": 101,
        "licenseNo": "LIC123",
        "cuttingPermit": "CP01",
        "timberMark": "TMK456",
        "exempted": true,
        "multiMark": false,
        "netArea": 12.5,
        "submitter": "submitter1",
        "comments": "Some comments",
        "totalBlocks": 3
      }""";

  public static final String REPORTING_UNIT_EXPANDED_MINIMAL = """
      {
        "id": 102,
        "exempted": false,
        "multiMark": false,
        "netArea": 0.0,
        "totalBlocks": 0
      }""";

  public static final String REPORTING_UNIT_EXPANDED_EMPTY = """
      {
        "id": 203,
        "exempted": false,
        "multiMark": false,
        "netArea": 0.0,
        "totalBlocks": 0
      }""";
}

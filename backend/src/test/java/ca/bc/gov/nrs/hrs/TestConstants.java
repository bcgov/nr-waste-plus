package ca.bc.gov.nrs.hrs;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TestConstants {

  public static final String EXPANDED_101 = """
      {
        "id": 201,
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
  public static final String EXPANDED_102 = """
      {
        "id": 202,
        "exempted": false,
        "multiMark": false,
        "netArea": 0.0,
        "totalBlocks": 0
      }""";
  public static final String EXPANDED_NULL = """
      {
        "id": null,
        "exempted": false,
        "multiMark": false,
        "netArea": 0.0,
        "totalBlocks": 0
      }""";
  public static final String EXPANDED_NEGATIVE = """
      {
        "id": -2,
        "exempted": false,
        "multiMark": false,
        "netArea": 0.0,
        "totalBlocks": 0
      }""";

  /** JSON response from the legacy API for {@code GET /api/reporting-units/{id}}. */
  public static final String LEGACY_RU_DETAILS = """
      {
        "clientNumber": "00012797",
        "clientLocnCode": "00",
        "sampling": {
          "code": "S01",
          "description": "Sample Method One"
        },
        "district": {
          "code": "DND",
          "description": "Nadina Natural Resource District"
        }
      }""";
}

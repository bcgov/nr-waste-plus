package ca.bc.gov.nrs.hrs;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TestConstants {

  public static final String EXPANDED_101 = """
      {
        "id": 201,
        "licenceNo": "LIC123",
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
}

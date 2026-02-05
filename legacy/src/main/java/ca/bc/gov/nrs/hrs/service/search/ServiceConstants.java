package ca.bc.gov.nrs.hrs.service.search;

import java.util.Map;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Constants used by search service classes.
 *
 * <p>This utility class provides constant mappings for field name translations used during
 * sorting operations. It maps client-visible property names to their corresponding database column
 * names for sorting in both reporting unit and client district searches.</p>
 *
 * <p>Instances of this class cannot be created as it has a private constructor.</p>
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ServiceConstants {

  /* Database column name for client number field. */
  private static final String CLIENT_NUMBER = "client_number";
  /* Database column/alias name for client name/description field. */
  private static final String CLIENT_NAME = "client_name";
  /* Database column name for sampling code field. */
  private static final String SAMPLING_CODE = "sampling_code";
  /* Database column name for district code field. */
  private static final String DISTRICT_CODE = "district_code";
  /* Database column name for status code field. */
  private static final String STATUS_CODE = "status_code";

  /**
   * Mapping of client-visible reporting unit search property names to database column names.
   *
   * <p>This map is used to translate sort field names in API requests to the corresponding
   * database
   * columns. Supports sorting by reporting unit number, block ID, client information, sampling
   * code, district code, status code, and last updated timestamp.</p>
   */
  static final Map<String, String> SORT_FIELDS =
      Map.ofEntries(
          Map.entry("ruNumber", "ru_number"),
          Map.entry("blockId", "block_id"),
          Map.entry("cutBlockId", "cut_block_id"),
          Map.entry("client.code", CLIENT_NUMBER),
          Map.entry("client.description", CLIENT_NAME),
          Map.entry("sampling", SAMPLING_CODE),
          Map.entry("sampling.code", SAMPLING_CODE),
          Map.entry("sampling.description", SAMPLING_CODE),
          Map.entry("district", DISTRICT_CODE),
          Map.entry("district.code", DISTRICT_CODE),
          Map.entry("district.description", DISTRICT_CODE),
          Map.entry("status", STATUS_CODE),
          Map.entry("status.code", STATUS_CODE),
          Map.entry("status.description", STATUS_CODE),
          Map.entry("lastUpdated", "last_updated"),
          Map.entry("licenceNumber", "licence_number"),
          Map.entry("cuttingPermit", "cutting_permit"),
          Map.entry("timberMark", "timber_mark")
      );

  /**
   * Mapping of client-visible client district search property names to database column names.
   *
   * <p>This map is used to translate sort field names in "my forest clients" API requests to the
   * corresponding database columns. Supports sorting by client information, submission counts,
   * block counts, and last update timestamp.</p>
   */
  static final Map<String, String> SORT_DISTRICT_FIELDS =
      Map.ofEntries(
          Map.entry("client", CLIENT_NUMBER),
          Map.entry("clientNumber", CLIENT_NUMBER),
          Map.entry("clientName", CLIENT_NAME),
          Map.entry("submissionsCount", "submissions_count"),
          Map.entry("blocksCount", "blocks_count"),
          Map.entry("lastUpdate", "last_update")
      );
}
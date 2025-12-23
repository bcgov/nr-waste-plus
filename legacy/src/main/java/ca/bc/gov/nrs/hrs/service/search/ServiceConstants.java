package ca.bc.gov.nrs.hrs.service.search;

import java.util.Map;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ServiceConstants {

  static final Map<String, String> SORT_FIELDS =
      Map.ofEntries(
          Map.entry("ruNumber", "ru_number"),
          Map.entry("blockId", "block_id"),
          Map.entry("client", "client_number"),
          Map.entry("clientNumber", "client_number"),
          Map.entry("clientName", "client_number"),
          Map.entry("sampling", "sampling_code"),
          Map.entry("samplingCode", "sampling_code"),
          Map.entry("samplingName", "sampling_code"),
          Map.entry("district", "district_code"),
          Map.entry("districtCode", "district_code"),
          Map.entry("districtName", "district_code"),
          Map.entry("status", "status_code"),
          Map.entry("statusCode", "status_code"),
          Map.entry("statusName", "status_code"),
          Map.entry("lastUpdated", "last_updated")
      );
  static final Map<String, String> SORT_DISTRICT_FIELDS =
      Map.ofEntries(
          Map.entry("client", "client_number"),
          Map.entry("clientNumber", "client_number"),
          Map.entry("clientName", "client_number"),
          Map.entry("submissionsCount", "submissions_count"),
          Map.entry("blocksCount", "blocks_count"),
          Map.entry("lastUpdate", "last_update")
      );
}

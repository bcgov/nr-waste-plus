package ca.bc.gov.nrs.hrs.service.formula;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Resolves dynamic {@code da.*} and {@code sc.*} paths from effective data. */
@Service
@RequiredArgsConstructor
public class FormulaRuntimeResolver {
  private final DistrictVolumeRepository districtVolumeRepository;

  /** Resolves a runtime variable for a submission date, area, and district. */
  public BigDecimal resolve(LocalDate date, Area area, String district, String path) {
    Objects.requireNonNull(date, "date");
    Objects.requireNonNull(area, "area");
    if (district == null || district.isBlank() || path == null || path.isBlank()) {
      throw failure("A district and variable path are required.");
    }
    String[] parts = path.split("\\.");
    if (parts.length < 2) {
      throw failure("Invalid formula variable path: " + path);
    }
    return switch (parts[0]) {
      case "da" -> resolveDistrictAverage(date, area, district, parts, path);
      case "sc" -> resolveSpeciesComposition(date, area, district, parts, path);
      default -> throw failure("Runtime resolution is not available for namespace '"
          + parts[0] + "'.");
    };
  }

  private BigDecimal resolveDistrictAverage(LocalDate date, Area area, String district,
      String[] parts, String path) {
    if (parts.length != 3) {
      throw failure("District-average path must be da.<group>.<field>: " + path);
    }
    DistrictVolumeEntity entity = find(date, area, ConfigType.DISTRICT_VOLUME, path);
    TableData data = entity.getTableData();
    String requestedGroup = parts[1].toLowerCase(java.util.Locale.ROOT);
    JsonNode row = area == Area.COASTAL
        ? findGroupRow(data, "sections", requestedGroup, district, path)
        : findGroupRow(data, "zones", requestedGroup, district, path);
    return scale(numberAt(row, parts[2], path));
  }

  private BigDecimal resolveSpeciesComposition(LocalDate date, Area area, String district,
      String[] parts, String path) {
    if (parts.length != 2) {
      throw failure("Species-composition path must be sc.<species>: " + path);
    }
    DistrictVolumeEntity entity = find(date, area, ConfigType.SPECIES_COMPOSITION, path);
    SpeciesCompositionRow row = entity.getTableData().speciesRows().stream()
        .filter(candidate -> candidate.district() != null
            && district.equalsIgnoreCase(candidate.district().code()))
        .findFirst().orElseThrow(() -> failure("District '" + district
            + "' is missing for " + path + "."));
    BigDecimal value = row.species() == null ? null : row.species().get(parts[1]);
    if (value == null) {
      throw failure("Species '" + parts[1] + "' is missing for district '" + district + "'.");
    }
    return scale(value);
  }

  private DistrictVolumeEntity find(LocalDate date, Area area, ConfigType type, String path) {
    return districtVolumeRepository.findEffectiveByConfigTypeAndArea(type, area, date)
        .orElseThrow(() -> failure("No " + type + " configuration is effective for " + path + "."));
  }

  private JsonNode findGroupRow(TableData data, String groupCollection, String group,
      String district, String path) {
    JsonNode root = JsonNodeFactoryHolder.toTree(data);
    JsonNode groups = root.get(groupCollection);
    if (groups == null || !groups.isArray()) {
      throw failure("No " + groupCollection + " are available for " + path + ".");
    }
    for (JsonNode candidate : groups) {
      if (normalize(candidate.path("name").asText()).equals(group)) {
        JsonNode districts = candidate.get("districts");
        if (districts != null && districts.isArray()) {
          for (JsonNode row : districts) {
            if (district.equalsIgnoreCase(row.path("district").path("code").asText())) {
              return row;
            }
          }
        }
        throw failure("District '" + district + "' is missing for " + path + ".");
      }
    }
    throw failure("Group '" + group + "' is missing for " + path + ".");
  }

  private BigDecimal numberAt(JsonNode row, String field, String path) {
    JsonNode value = row.get(field);
    if (value == null || !value.isNumber()) {
      throw failure("Numeric field '" + field + "' is missing for " + path + ".");
    }
    return value.decimalValue();
  }

  private String normalize(String label) {
    if (label == null) {
      return "";
    }
    return label.replaceAll("[^A-Za-z0-9]", "").toLowerCase(java.util.Locale.ROOT);
  }

  private BigDecimal scale(BigDecimal value) { return value.setScale(3, RoundingMode.HALF_UP); }

  private ResponseStatusException failure(String message) {
    return new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, message);
  }

  private static final class JsonNodeFactoryHolder {
    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER =
        new com.fasterxml.jackson.databind.ObjectMapper();

    private static JsonNode toTree(TableData data) {
      return MAPPER.valueToTree(data);
    }
  }
}

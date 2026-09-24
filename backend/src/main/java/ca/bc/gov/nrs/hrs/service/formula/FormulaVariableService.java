package ca.bc.gov.nrs.hrs.service.formula;

import ca.bc.gov.nrs.hrs.dto.formula.FormulaNamespaceCatalogDto;
import ca.bc.gov.nrs.hrs.dto.formula.FormulaVariableCatalogItemDto;
import ca.bc.gov.nrs.hrs.dto.formula.FormulaVariablesResponse;
import ca.bc.gov.nrs.hrs.dto.formula.VariableNodeDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictRow;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Section;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Zone;
import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Builds the three complementary variable representations for a given effective date and area.
 *
 * <p>Produces district-scoped runtime values and a catalog resolved from those values. The catalog
 * therefore contains only variables available to the selected district.
 *
 * <p>Produces:
 * <ul>
 *   <li>{@code namespaces} — nested tree with resolved values for autocomplete UIs</li>
 *   <li>{@code flat} — backward-compatible flat map (drop-in for
 *       {@link FormulaEvaluationService#buildVariables})</li>
 *   <li>{@code schema} — structure-only metadata (cacheable, changes ~1/year)</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FormulaVariableService {
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private static final Map<String, String> DA_FIELD_LABELS = Map.ofEntries(
      Map.entry("avoidableSawlog", "Avoidable Sawlog"),
      Map.entry("avoidableGrade4", "Avoidable Grade 4"),
      Map.entry("unavoidableGrade4", "Unavoidable Grade 4"),
      Map.entry("avoidableHembalGradeU", "Avoidable Hembal Grade U"),
      Map.entry("avoidableGradeY", "Avoidable Grade Y"),
      Map.entry("unavoidable", "Unavoidable"),
      Map.entry("total", "Total")
  );

  private static final Map<String, String> SPECIES_LABELS = Map.ofEntries(
      Map.entry("AL", "Alaska Yellow Cedar"),
      Map.entry("BA", "Balsam"),
      Map.entry("CE", "Cedar"),
      Map.entry("CW", "Western Red Cedar"),
      Map.entry("DF", "Douglas Fir"),
      Map.entry("EP", "Engelmann Spruce"),
      Map.entry("FD", "Fir"),
      Map.entry("HM", "Hemlock"),
      Map.entry("HT", "Western Hemlock"),
      Map.entry("LW", "Larch"),
      Map.entry("PW", "Ponderosa Pine"),
      Map.entry("PY", "Yellow Pine"),
      Map.entry("SB", "Subalpine Fir"),
      Map.entry("SE", "Spruce"),
      Map.entry("SF", "True Fir"),
      Map.entry("SS", "Sitka Spruce"),
      Map.entry("YC", "Yellow Cedar")
  );

  private final DistrictVolumeRepository districtVolumeRepository;

  /**
   * Builds the complete variables response for the given date, area, and district.
   *
   * @param date the effective date
   * @param area the geographic area
   * @param districtCode the district code to filter by
   * @return the three-representation response
   * @throws ResponseStatusException if no configuration is effective
   */
  public FormulaVariablesResponse build(LocalDate date, Area area, String districtCode) {
    DistrictVolumeEntity dvEntity = districtVolumeRepository
        .findEffectiveByConfigTypeAndArea(ConfigType.DISTRICT_VOLUME, area, date)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "No district volume configuration is effective for the requested date and area."));

    DistrictVolumeEntity scEntity = districtVolumeRepository
        .findEffectiveByConfigTypeAndArea(ConfigType.SPECIES_COMPOSITION, area, date)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "No species composition configuration is effective for the requested date and area."));

    Map<String, VariableNodeDto> namespaces = new LinkedHashMap<>();
    namespaces.put("da", buildDaNode(dvEntity.getTableData(), area, districtCode));
    namespaces.put("sc", buildScNode(scEntity.getTableData(), districtCode));

    Map<String, BigDecimal> flat = new LinkedHashMap<>();
    collectLeaves(namespaces, flat);

    JsonNode schema = buildSchema(dvEntity.getTableData(), scEntity.getTableData(), area,
        districtCode);

    return new FormulaVariablesResponse(
        date, area, namespaces, flat, schema, buildCatalog(namespaces));
  }

  private List<FormulaNamespaceCatalogDto> buildCatalog(
      Map<String, VariableNodeDto> resolvedNamespaces) {
    List<FormulaNamespaceCatalogDto> catalog = new ArrayList<>();
    catalog.add(runtimeCatalog(
        "da", "District average",
        "District average volumes from DISTRICT_VOLUME table_data",
        resolvedNamespaces.get("da")));
    catalog.add(runtimeCatalog(
        "sc", "Species composition", "Species composition percentages",
        resolvedNamespaces.get("sc")));
    catalog.add(submissionCatalog("submission", "Submission"));
    catalog.add(submissionCatalog("hbs", "HBS"));
    catalog.add(submissionCatalog("fta", "FTA"));
    return List.copyOf(catalog);
  }

  private FormulaNamespaceCatalogDto submissionCatalog(String prefix, String label) {
    return new FormulaNamespaceCatalogDto(
        prefix,
        label,
        "Values provided during submission",
        FormulaNamespaceCatalogDto.Availability.SUBMISSION,
        List.of());
  }

  private FormulaNamespaceCatalogDto runtimeCatalog(
      String prefix, String label, String description, VariableNodeDto node) {
    List<FormulaVariableCatalogItemDto> variables = new ArrayList<>();
    collectCatalogItems(node, variables);
    return new FormulaNamespaceCatalogDto(
        prefix,
        label,
        description,
        FormulaNamespaceCatalogDto.Availability.RUNTIME,
        variables);
  }

  private void collectCatalogItems(
      VariableNodeDto node, List<FormulaVariableCatalogItemDto> variables) {
    if (node == null) {
      return;
    }
    if (node.path() != null) {
      variables.add(new FormulaVariableCatalogItemDto(node.path(), node.label(), node.value()));
      return;
    }
    if (node.children() != null) {
      node.children().values().forEach(child -> collectCatalogItems(child, variables));
    }
  }

  private VariableNodeDto buildDaNode(TableData tableData, Area area, String districtCode) {
    Map<String, VariableNodeDto> groupChildren = new LinkedHashMap<>();

    if (area == Area.INTERIOR && tableData.zones() != null) {
      for (Zone zone : tableData.zones()) {
        String groupName = normalizeGroupName(zone.name());
        Map<String, VariableNodeDto> fieldNodes =
            buildFieldNodes(zone.districts(), groupName, districtCode);
        if (!fieldNodes.isEmpty()) {
          putGroup(groupChildren, groupName,
              VariableNodeDto.object("Group " + zone.name() + " values", fieldNodes));
        }
      }
    } else if (area == Area.COASTAL && tableData.sections() != null) {
      for (Section section : tableData.sections()) {
        String groupName = normalizeGroupName(section.name());
        Map<String, VariableNodeDto> fieldNodes =
            buildFieldNodes(section.districts(), groupName, districtCode);
        if (!fieldNodes.isEmpty()) {
          putGroup(groupChildren, groupName,
              VariableNodeDto.object("Group " + section.name() + " values", fieldNodes));
        }
      }
    }

    return VariableNodeDto.object(
        "District average volumes from DISTRICT_VOLUME table_data", groupChildren);
  }

  private Map<String, VariableNodeDto> buildFieldNodes(List<DistrictRow> districts,
      String groupName, String districtCode) {
    Map<String, VariableNodeDto> fieldNodes = new LinkedHashMap<>();
    for (DistrictRow row : districts) {
      if (row.district() == null || !districtCode.equalsIgnoreCase(row.district().code())) {
        continue;
      }
      Map<String, BigDecimal> fields = extractDaFields(row);
      for (var entry : fields.entrySet()) {
        String field = entry.getKey();
        BigDecimal value = entry.getValue();
        String path = "da." + groupName + "." + field;
        String label = DA_FIELD_LABELS.get(field);
        if (label == null) {
          label = humanize(field);
        }
        fieldNodes.put(field, VariableNodeDto.number(path, value, label));
      }
    }
    return fieldNodes;
  }

  private Map<String, BigDecimal> extractDaFields(DistrictRow row) {
    Map<String, BigDecimal> fields = new LinkedHashMap<>();
    if (row.avoidableSawlog() != null) {
      fields.put("avoidableSawlog", scale(row.avoidableSawlog()));
    }
    if (row.avoidableGrade4() != null) {
      fields.put("avoidableGrade4", scale(row.avoidableGrade4()));
    }
    if (row.unavoidableGrade4() != null) {
      fields.put("unavoidableGrade4", scale(row.unavoidableGrade4()));
    }
    if (row.avoidableHembalGradeU() != null) {
      fields.put("avoidableHembalGradeU", scale(row.avoidableHembalGradeU()));
    }
    if (row.avoidableGradeY() != null) {
      fields.put("avoidableGradeY", scale(row.avoidableGradeY()));
    }
    if (row.unavoidable() != null) {
      fields.put("unavoidable", scale(row.unavoidable()));
    }
    if (row.total() != null) {
      fields.put("total", scale(row.total()));
    }
    for (var additional : row.additionalProperties().entrySet()) {
      Object val = additional.getValue();
      if (val instanceof BigDecimal bd) {
        fields.putIfAbsent(additional.getKey(), scale(bd));
      } else if (val instanceof Number n) {
        fields.putIfAbsent(additional.getKey(), scale(BigDecimal.valueOf(n.doubleValue())));
      }
    }
    return fields;
  }

  private VariableNodeDto buildScNode(TableData tableData, String districtCode) {
    Map<String, VariableNodeDto> speciesNodes = new LinkedHashMap<>();

    if (tableData.speciesRows() != null) {
      for (SpeciesCompositionRow row : tableData.speciesRows()) {
        if (row.district() == null || !districtCode.equalsIgnoreCase(row.district().code())) {
          continue;
        }
        if (row.species() != null) {
          for (var entry : row.species().entrySet()) {
            String speciesCode = entry.getKey();
            BigDecimal value = entry.getValue();
            String path = "sc." + speciesCode;
            String label = SPECIES_LABELS.getOrDefault(speciesCode, speciesCode);
            speciesNodes.put(speciesCode, VariableNodeDto.number(path, scale(value), label));
          }
        }
      }
    }

    return VariableNodeDto.object("Species composition percentages", speciesNodes);
  }

  private JsonNode buildSchema(TableData dvData, TableData scData, Area area,
      String districtCode) {
    ObjectNode root = MAPPER.createObjectNode();

    ObjectNode daSchema = MAPPER.createObjectNode();
    if (area == Area.INTERIOR && dvData.zones() != null) {
      for (Zone zone : dvData.zones()) {
        setGroupSchema(daSchema, zone.name(), buildGroupSchema(zone.districts(), districtCode));
      }
    } else if (area == Area.COASTAL && dvData.sections() != null) {
      for (Section section : dvData.sections()) {
        setGroupSchema(daSchema, section.name(),
            buildGroupSchema(section.districts(), districtCode));
      }
    }
    root.set("da", daSchema);

    ObjectNode scSchema = MAPPER.createObjectNode();
    Set<String> species = new LinkedHashSet<>();
    if (scData.speciesRows() != null) {
      for (SpeciesCompositionRow row : scData.speciesRows()) {
        if (row.district() == null || !districtCode.equalsIgnoreCase(row.district().code())) {
          continue;
        }
        if (row.species() != null) {
          species.addAll(row.species().keySet());
        }
      }
    }
    ArrayNode speciesArray = MAPPER.createArrayNode();
    species.forEach(speciesArray::add);
    scSchema.set("species", speciesArray);
    root.set("sc", scSchema);

    return root;
  }

  private void putGroup(Map<String, VariableNodeDto> groups, String groupName,
      VariableNodeDto node) {
    if (groups.putIfAbsent(groupName, node) != null) {
      throw new IllegalStateException(
          "Normalized formula variable group name collision: " + groupName);
    }
  }

  private void setGroupSchema(ObjectNode schema, String originalName, JsonNode groupSchema) {
    String normalizedName = normalizeGroupName(originalName);
    if (schema.has(normalizedName)) {
      throw new IllegalStateException(
          "Normalized formula variable group name collision: " + normalizedName);
    }
    schema.set(normalizedName, groupSchema);
  }

  private ObjectNode buildGroupSchema(List<DistrictRow> districts, String districtCode) {
    Set<String> fields = new LinkedHashSet<>();
    for (DistrictRow row : districts) {
      if (row.district() == null || !districtCode.equalsIgnoreCase(row.district().code())) {
        continue;
      }
      fields.addAll(extractDaFields(row).keySet());
    }
    ObjectNode groupSchema = MAPPER.createObjectNode();
    ArrayNode fieldsArray = MAPPER.createArrayNode();
    fields.forEach(fieldsArray::add);
    groupSchema.set("fields", fieldsArray);
    return groupSchema;
  }

  private void collectLeaves(Map<String, VariableNodeDto> nodes, Map<String, BigDecimal> flat) {
    for (var entry : nodes.entrySet()) {
      VariableNodeDto node = entry.getValue();
      if ("number".equals(node.type()) && node.path() != null) {
        flat.put(node.path(), node.value());
      } else if (node.children() != null) {
        collectLeaves(node.children(), flat);
      }
    }
  }

  /** Normalizes a zone/section name to a lowercase alphanumeric group identifier. */
  static String normalizeGroupName(String name) {
    if (name == null) {
      return "";
    }
    return name.replaceAll("[^A-Za-z0-9]", "").toLowerCase(Locale.ROOT);
  }

  private static String humanize(String camelCase) {
    StringBuilder sb = new StringBuilder();
    for (char c : camelCase.toCharArray()) {
      if (Character.isUpperCase(c)) {
        if (!sb.isEmpty()) {
          sb.append(' ');
        }
        sb.append(Character.toLowerCase(c));
      } else {
        sb.append(c);
      }
    }
    String result = sb.toString();
    return Character.toUpperCase(result.charAt(0)) + result.substring(1);
  }

  private static BigDecimal scale(BigDecimal value) {
    return value == null ? null : value.setScale(3, RoundingMode.HALF_UP);
  }
}

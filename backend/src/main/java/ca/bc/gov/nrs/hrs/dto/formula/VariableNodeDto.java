package ca.bc.gov.nrs.hrs.dto.formula;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.util.Map;

/**
 * A node in the nested variable tree returned by the variables endpoint.
 *
 * <p>Branch nodes represent namespaces or groups ({@code type = "object"}) and carry a
 * {@code children} map. Leaf nodes represent individual variables ({@code type = "number"})
 * and carry a resolved {@code value}, dotted {@code path}, and human-readable {@code label}.
 *
 * @param type        node type — {@code "object"} for branches, {@code "number"} for leaves
 * @param description optional human-readable description of this node
 * @param children    child nodes (present on branch nodes, absent on leaves)
 * @param path        dotted variable path (present on leaf nodes only)
 * @param value       resolved numeric value (present on leaf nodes only)
 * @param label       human-readable label (present on leaf nodes only)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record VariableNodeDto(
    String type,
    String description,
    Map<String, VariableNodeDto> children,
    String path,
    BigDecimal value,
    String label
) {

  /** Creates a branch node (namespace or group). */
  public static VariableNodeDto object(String description, Map<String, VariableNodeDto> children) {
    return new VariableNodeDto("object", description, children, null, null, null);
  }

  /** Creates a leaf node (individual variable with resolved value). */
  public static VariableNodeDto number(String path, BigDecimal value, String label) {
    return new VariableNodeDto("number", null, null, path, value, label);
  }
}

package ca.bc.gov.nrs.hrs.dto.formula;

import java.util.List;

/** Describes one grammar-approved formula namespace for the authoring catalog. */
public record FormulaNamespaceCatalogDto(
    String prefix,
    String label,
    String description,
    Availability availability,
    List<FormulaVariableCatalogItemDto> variables) {

  /** Indicates whether values can be resolved while an administrator edits a formula. */
  public enum Availability {
    RUNTIME,
    SUBMISSION
  }
}

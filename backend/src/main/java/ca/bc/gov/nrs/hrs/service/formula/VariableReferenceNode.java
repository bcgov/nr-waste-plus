package ca.bc.gov.nrs.hrs.service.formula;

/** A reference to a variable in one of the approved typed namespaces. */
public record VariableReferenceNode(String name, int startOffset, int endOffset)
    implements FormulaNode {
}

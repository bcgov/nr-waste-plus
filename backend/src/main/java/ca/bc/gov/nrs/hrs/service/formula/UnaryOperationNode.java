package ca.bc.gov.nrs.hrs.service.formula;

/** A unary plus or minus operation. */
public record UnaryOperationNode(
    UnaryOperator operator,
    FormulaNode operand,
    int startOffset,
    int endOffset) implements FormulaNode {
}

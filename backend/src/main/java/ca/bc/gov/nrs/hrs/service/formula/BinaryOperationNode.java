package ca.bc.gov.nrs.hrs.service.formula;

/** A mathematical or conditional binary operation. */
public record BinaryOperationNode(
    FormulaNode left,
    BinaryOperator operator,
    FormulaNode right,
    int startOffset,
    int endOffset) implements FormulaNode {
}

package ca.bc.gov.nrs.hrs.service.formula;

/** A statically validated Excel-like conditional expression.
 *
 * <p>This node deliberately contains no evaluation behavior. Runtime evaluation is a later
 * contract concern.
 */
public record IfNode(
    FormulaNode condition,
    FormulaNode valueIfTrue,
    FormulaNode valueIfFalse,
    int startOffset,
    int endOffset) implements FormulaNode {
}

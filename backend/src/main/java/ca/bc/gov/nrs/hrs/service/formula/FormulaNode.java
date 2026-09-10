package ca.bc.gov.nrs.hrs.service.formula;

/** A node in the safe, non-executable formula abstract syntax tree. */
public sealed interface FormulaNode
    permits LiteralNode, VariableReferenceNode, BinaryOperationNode, UnaryOperationNode, IfNode {

  /** The inclusive source start offset. */
  int startOffset();

  /** The exclusive source end offset. */
  int endOffset();
}

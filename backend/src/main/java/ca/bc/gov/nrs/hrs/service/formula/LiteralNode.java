package ca.bc.gov.nrs.hrs.service.formula;

import java.math.BigDecimal;

/** A decimal numeric literal. */
public record LiteralNode(BigDecimal value, int startOffset, int endOffset)
    implements FormulaNode {
}

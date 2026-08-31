package ca.bc.gov.nrs.hrs.service.formula;

import java.math.BigDecimal;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Validates parsed formulas without ever evaluating executable code. */
public final class FormulaValidator {
  private static final Set<String> NAMESPACES = Set.of("da", "sc", "submission", "hbs", "fta");
  private final FormulaParser parser;

  /** Creates a validator with configurable parser limits. */
  public FormulaValidator(FormulaParser.Options options) {
    parser = new FormulaParser(options);
  }

  /** Validates all definitions in deterministic key order. */
  public List<FormulaValidationError> validate(FormulaValidationRequest request) {
    Map<String, FormulaDefinition> definitions = new HashMap<>();
    List<FormulaValidationError> errors = new ArrayList<>();
    for (FormulaDefinition definition : request.formulas()) {
      if (definitions.putIfAbsent(definition.formulaKey(), definition) != null) {
        errors.add(error(FormulaValidationError.Code.SYNTAX_ERROR,
            "Duplicate formula key: " + definition.formulaKey(), 0, 0));
      }
    }
    Map<String, FormulaNode> nodes = new HashMap<>();
    for (FormulaDefinition definition : request.formulas().stream()
        .sorted(Comparator.comparing(FormulaDefinition::formulaKey)).toList()) {
      try {
        nodes.put(definition.formulaKey(), parser.parse(definition.expression(), request.mode()));
      } catch (FormulaParseException exception) {
        errors.add(exception.error());
      }
    };
    Map<String, BigDecimal> known = new HashMap<>(request.knownVariables());
    known.putAll(nodes.keySet().stream().collect(java.util.stream.Collectors.toMap(key -> key,
        key -> BigDecimal.ONE)));
    for (String key : nodes.keySet().stream().sorted().toList()) {
      validateNode(nodes.get(key), known, definitions.keySet(), errors);
    }
    errors.addAll(findCycles(nodes));
    return List.copyOf(errors);
  }

  private ValueType validateNode(FormulaNode node, Map<String, BigDecimal> known,
      Set<String> formulaKeys,
      List<FormulaValidationError> errors) {
    return switch (node) {
      case LiteralNode literal -> ValueType.NUMERIC;
      case VariableReferenceNode variable -> {
        int dot = variable.name().indexOf('.');
        String namespace = dot < 0 ? variable.name() : variable.name().substring(0, dot);
        if (formulaKeys.contains(variable.name())) {
          yield ValueType.NUMERIC;
        }
        if (dot < 1 || dot == variable.name().length() - 1
            || !NAMESPACES.contains(namespace)) {
          errors.add(error(FormulaValidationError.Code.UNKNOWN_VARIABLE,
              "Unknown variable: " + variable.name(), variable.startOffset(),
              variable.endOffset()));
        } else if (!known.containsKey(variable.name())) {
          errors.add(error(FormulaValidationError.Code.UNKNOWN_VARIABLE,
              "Unknown variable: " + variable.name(), variable.startOffset(),
              variable.endOffset()));
        }
        yield ValueType.NUMERIC;
      }
      case UnaryOperationNode unary -> {
        ValueType operandType = validateNode(unary.operand(), known, formulaKeys, errors);
        if (operandType != ValueType.NUMERIC) {
          addTypeError("Unary operators require a numeric expression", unary.operand(), errors);
        }
        yield ValueType.NUMERIC;
      }
      case BinaryOperationNode binary -> {
        ValueType leftType = validateNode(binary.left(), known, formulaKeys, errors);
        ValueType rightType = validateNode(binary.right(), known, formulaKeys, errors);
        if (binary.operator().isComparison()) {
          if (leftType != ValueType.NUMERIC || rightType != ValueType.NUMERIC) {
            addTypeError("Comparisons require numeric expressions", binary, errors);
          }
          yield ValueType.BOOLEAN;
        }
        if (leftType != ValueType.NUMERIC || rightType != ValueType.NUMERIC) {
          addTypeError("Arithmetic operators require numeric expressions", binary, errors);
        }
        if (binary.operator() == BinaryOperator.DIVIDE && isZero(binary.right(), known)) {
          errors.add(error(FormulaValidationError.Code.DIVISION_BY_ZERO,
              "Division by zero", binary.right().startOffset(), binary.right().endOffset()));
        }
        yield ValueType.NUMERIC;
      }
      case IfNode ifNode -> {
        ValueType conditionType = validateNode(ifNode.condition(), known, formulaKeys, errors);
        ValueType trueType = validateNode(ifNode.valueIfTrue(), known, formulaKeys, errors);
        ValueType falseType = validateNode(ifNode.valueIfFalse(), known, formulaKeys, errors);
        if (conditionType != ValueType.BOOLEAN) {
          addTypeError("IF condition must be a boolean comparison", ifNode.condition(), errors);
        }
        if (trueType != ValueType.NUMERIC) {
          addTypeError("IF true branch must be numeric", ifNode.valueIfTrue(), errors);
        }
        if (falseType != ValueType.NUMERIC) {
          addTypeError("IF false branch must be numeric", ifNode.valueIfFalse(), errors);
        }
        yield ValueType.NUMERIC;
      }
    };
  }

  private enum ValueType { NUMERIC, BOOLEAN }

  private void addTypeError(String message, FormulaNode node, List<FormulaValidationError> errors) {
    errors.add(error(FormulaValidationError.Code.TYPE_ERROR, message,
        node.startOffset(), node.endOffset()));
  }

  private boolean isZero(FormulaNode node, Map<String, BigDecimal> known) {
    return constantValue(node, known).map(value -> value.signum() == 0).orElse(false);
  }

  private java.util.Optional<BigDecimal> constantValue(FormulaNode node,
      Map<String, BigDecimal> known) {
    return switch (node) {
      case LiteralNode literal -> java.util.Optional.of(literal.value());
      case VariableReferenceNode variable ->
          java.util.Optional.ofNullable(known.get(variable.name()));
      case UnaryOperationNode unary -> constantValue(unary.operand(), known).map(value ->
          unary.operator() == UnaryOperator.MINUS ? value.negate() : value);
      case BinaryOperationNode binary -> {
        java.util.Optional<BigDecimal> left = constantValue(binary.left(), known);
        java.util.Optional<BigDecimal> right = constantValue(binary.right(), known);
        if (left.isEmpty() || right.isEmpty()) {
          yield java.util.Optional.empty();
        }
        yield switch (binary.operator()) {
          case ADD -> java.util.Optional.of(left.get().add(right.get()));
          case SUBTRACT -> java.util.Optional.of(left.get().subtract(right.get()));
          case MULTIPLY -> java.util.Optional.of(left.get().multiply(right.get()));
          case DIVIDE -> java.util.Optional.empty();
          default -> java.util.Optional.empty();
        };
      }
      case IfNode ignored -> java.util.Optional.empty();
    };
  }

  private List<FormulaValidationError> findCycles(Map<String, FormulaNode> nodes) {
    Set<String> keys = nodes.keySet();
    Map<String, Set<String>> dependencies = new HashMap<>();
    for (Map.Entry<String, FormulaNode> entry : nodes.entrySet()) {
      Set<String> refs = new HashSet<>();
      collectNames(entry.getValue(), refs);
      refs.retainAll(keys);
      dependencies.put(entry.getKey(), refs);
    }
    List<FormulaValidationError> errors = new ArrayList<>();
    for (String key : keys.stream().sorted().toList()) {
      if (hasCycle(key, dependencies, new HashSet<>(), new ArrayDeque<>())) {
        errors.add(error(FormulaValidationError.Code.CYCLE_DETECTED,
            "Formula dependency cycle detected at: " + key, 0, 0));
      }
    }
    return errors;
  }

  private boolean hasCycle(String key, Map<String, Set<String>> dependencies,
      Set<String> visited, ArrayDeque<String> path) {
    if (path.contains(key)) {
      return true;
    }
    if (!visited.add(key)) {
      return false;
    }
    path.addLast(key);
    for (String dependency : dependencies.getOrDefault(key, Set.of()).stream().sorted().toList()) {
      if (hasCycle(dependency, dependencies, visited, path)) {
        return true;
      }
    }
    path.removeLast();
    return false;
  }

  private void collectNames(FormulaNode node, Set<String> names) {
    switch (node) {
      case VariableReferenceNode variable -> names.add(variable.name());
      case UnaryOperationNode unary -> collectNames(unary.operand(), names);
      case BinaryOperationNode binary -> {
        collectNames(binary.left(), names);
        collectNames(binary.right(), names);
      }
      case LiteralNode ignored -> { }
      case IfNode ifNode -> {
        collectNames(ifNode.condition(), names);
        collectNames(ifNode.valueIfTrue(), names);
        collectNames(ifNode.valueIfFalse(), names);
      }
    }
  }

  private FormulaValidationError error(FormulaValidationError.Code code, String message,
      int start, int end) {
    return new FormulaValidationError(code, message, start, end);
  }
}

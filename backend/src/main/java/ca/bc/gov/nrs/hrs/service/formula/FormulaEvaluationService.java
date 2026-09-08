package ca.bc.gov.nrs.hrs.service.formula;

import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetRowEntity;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Orchestrates formula evaluation and immutable snapshot persistence. */
@Slf4j
@Service
@RequiredArgsConstructor
public class FormulaEvaluationService {
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final String ROUNDING_POLICY = "HALF_UP";

  private final FormulaRuntimeResolver runtimeResolver;
  private final BlockCalculationSnapshotRepository snapshotRepository;
  private final ca.bc.gov.nrs.hrs.repository.FormulaSetRepository setRepository;
  private final ca.bc.gov.nrs.hrs.repository.FormulaSetRowRepository rowRepository;

  /**
   * Evaluates all formulas in the effective set and persists an immutable snapshot.
   *
   * @param blockId          the submission block identifier
   * @param districtVolumeId the district volume configuration identifier
   * @param date             submission effective date
   * @param area             INTERIOR or COASTAL
   * @param district         selected district code (e.g. "DCC")
   * @param user             current authenticated user
   * @return the evaluation result with outputs, inputs, and warnings
   * @throws FormulaEvaluationException if no formula set is effective, a variable cannot be
   *     resolved, or evaluation fails
   */
  @Transactional
  public FormulaEvaluationResult evaluate(
      Long blockId,
      Long districtVolumeId,
      LocalDate date,
      Area area,
      String district,
      String user) {

    var setEntity = setRepository.findEffective(area, date)
        .orElseThrow(() -> new FormulaEvaluationException(
            "No formula set is effective for the requested date and area."));

    List<FormulaSetRowEntity> rows = rowRepository
        .findByFormulaSetIdAndDeletedFalseOrderBySortOrderAscIdAsc(setEntity.getId());

    if (rows.isEmpty()) {
      throw new FormulaEvaluationException(
          "The effective formula set contains no active rows.");
    }

    Map<String, BigDecimal> variables = buildVariables(rows, date, area, district);
    Map<String, BigDecimal> outputs = new LinkedHashMap<>();
    ArrayNode warningsArray = MAPPER.createArrayNode();

    for (FormulaSetRowEntity row : rows) {
      try {
        FormulaNode ast = parseExpression(row.getExpression());
        BigDecimal result = FormulaEvaluator.evaluate(ast, variables);
        outputs.put(row.getFormulaKey(), result);
      } catch (FormulaEvaluationException ex) {
        throw new FormulaEvaluationException(
            "Evaluation failed for formula '" + row.getFormulaKey() + "': " + ex.getMessage(), ex);
      }
    }

    ObjectNode inputsJson = MAPPER.createObjectNode();
    variables.forEach((key, value) -> inputsJson.put(key, value));

    ObjectNode outputsJson = MAPPER.createObjectNode();
    outputs.forEach((key, value) -> outputsJson.put(key, value));

    JsonNode warningsJson = warningsArray.isEmpty() ? null : warningsArray;

    BlockCalculationSnapshotEntity snapshot = new BlockCalculationSnapshotEntity(
        blockId,
        districtVolumeId,
        null, // hbsWindowStart — not yet available
        null, // hbsWindowEnd — not yet available
        inputsJson,
        outputsJson,
        Instant.now(),
        ROUNDING_POLICY,
        warningsJson,
        user,
        user,
        Instant.now(),
        Instant.now());
    snapshotRepository.save(snapshot);

    return new FormulaEvaluationResult(outputs, inputsJson, warningsJson);
  }

  private Map<String, BigDecimal> buildVariables(
      List<FormulaSetRowEntity> rows, LocalDate date, Area area, String district) {

    Set<String> allPaths = new java.util.LinkedHashSet<>();
    for (FormulaSetRowEntity row : rows) {
      allPaths.addAll(FormulaVariableExtractor.extract(
          row.getExpression(), FormulaParseMode.CONDITIONAL));
    }

    Map<String, BigDecimal> variables = new LinkedHashMap<>();
    for (String path : allPaths) {
      String namespace = path.substring(0, path.indexOf('.'));
      try {
        BigDecimal value = switch (namespace) {
          case "da", "sc" -> runtimeResolver.resolve(date, area, district, path);
          case "submission" -> resolveSubmission(path);
          case "hbs", "fta" -> BigDecimal.ZERO;
          default -> throw new FormulaEvaluationException(
              "Unknown namespace '" + namespace + "' in variable " + path);
        };
        variables.put(path, value);
      } catch (FormulaEvaluationException ex) {
        throw ex;
      } catch (Exception ex) {
        throw new FormulaEvaluationException(
            "Failed to resolve variable " + path + ": " + ex.getMessage(), ex);
      }
    }
    return variables;
  }

  private FormulaNode parseExpression(String expression) {
    FormulaParser parser = new FormulaParser(new FormulaParser.Options(20, 100));
    return parser.parse(expression, FormulaParseMode.CONDITIONAL);
  }

  /**
   * Resolves a submission namespace variable. Currently a placeholder returning zero until
   * submission domain data is integrated.
   *
   * @param path namespace-qualified path (e.g. "submission.area")
   * @return resolved value (currently always zero)
   */
  private BigDecimal resolveSubmission(String path) {
    // TODO: resolve from block/submission entity data when submission domain is integrated
    return BigDecimal.ZERO;
  }
}

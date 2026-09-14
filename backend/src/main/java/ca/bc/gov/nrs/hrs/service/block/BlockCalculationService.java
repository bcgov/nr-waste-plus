package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationWarning;
import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Thin read service for block calculation snapshots. */
@Service
@RequiredArgsConstructor
public class BlockCalculationService {

  private final BlockCalculationSnapshotRepository repository;

  /**
   * Returns the latest calculation snapshot for the given block, or empty if none exists.
   *
   * @param blockId the block identifier
   * @return optional containing the mapped DTO, or empty
   */
  public Optional<BlockCalculationDto> findLatest(Long blockId) {
    return repository.findTopByBlockIdOrderByCalculatedAtDesc(blockId).map(this::toDto);
  }

  private BlockCalculationDto toDto(BlockCalculationSnapshotEntity entity) {
    JsonNode outputsNode = entity.getOutputs();
    BigDecimal grandTotal = sumOutputValues(outputsNode);

    BlockCalculationDto.Outputs outputs =
        new BlockCalculationDto.Outputs(
            List.of(), // perMark — empty until mark-level resolution is available
            grandTotal);

    List<BlockCalculationWarning> warnings = new ArrayList<>();
    JsonNode warningsNode = entity.getWarnings();
    if (warningsNode != null && warningsNode.isArray()) {
      warningsNode.forEach(
          w -> {
            if (w.isTextual()) {
              warnings.add(new BlockCalculationWarning(w.asText(), null));
            } else if (w.isObject()) {
              String code = w.has("code") ? w.get("code").asText() : null;
              String message = w.has("message") ? w.get("message").asText() : null;
              warnings.add(new BlockCalculationWarning(code, message));
            }
          });
    }

    return new BlockCalculationDto(
        entity.getBlockId(),
        entity.getDistrictVolumeId(),
        entity.getCalculatedAt(),
        entity.getRoundingPolicy(),
        outputs,
        warnings);
  }

  private BigDecimal sumOutputValues(JsonNode outputsNode) {
    if (outputsNode == null || outputsNode.isNull()) {
      return BigDecimal.ZERO;
    }
    BigDecimal total = BigDecimal.ZERO;
    var fields = outputsNode.fields();
    while (fields.hasNext()) {
      Map.Entry<String, JsonNode> entry = fields.next();
      JsonNode val = entry.getValue();
      if (val.isNumber()) {
        total = total.add(val.decimalValue());
      }
    }
    return total;
  }
}
